import assert from 'node:assert'
import fs, { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileExists, readIfExists, rmIfExists } from '@atproto/common'
import * as crypto from '@atproto/crypto'
import { ExportableKeypair, Keypair } from '@atproto/crypto'
import { InvalidRequestError } from '@atproto/xrpc-server'
import { ActorStoreConfig } from '../config'
import { retrySqlite } from '../db'
import { DiskBlobStore } from '../disk-blobstore'
import { blobStoreLogger } from '../logger'
import { ActorStoreReader } from './actor-store-reader'
import { ActorStoreResources } from './actor-store-resources'
import { ActorStoreTransactor } from './actor-store-transactor'
import { ActorStoreWriter } from './actor-store-writer'
import { ActorDb, getDb, getMigrator } from './db'

export class ActorStore {
  reservedKeyDir: string
  private usingPostgres: boolean

  constructor(
    public cfg: ActorStoreConfig,
    public resources: ActorStoreResources,
  ) {
    this.reservedKeyDir = path.join(cfg.directory, 'reserved_keys')
    this.usingPostgres = !!(
      cfg.databaseUrl &&
      (cfg.databaseUrl.startsWith('postgres://') ||
        cfg.databaseUrl.startsWith('postgresql://'))
    )
  }

  // Generate PostgreSQL schema name from DID
  private async getSchemaName(did: string): Promise<string> {
    const didHash = await crypto.sha256Hex(did)
    // Use hash prefix to avoid schema name length limits and special characters
    return `actor_${didHash.slice(0, 16)}`
  }

  async getLocation(did: string) {
    const didHash = await crypto.sha256Hex(did)
    const directory = path.join(this.cfg.directory, didHash.slice(0, 2), did)

    // For PostgreSQL, use the database URL with actor-specific schema
    // For SQLite, use per-actor file
    const dbLocation = this.cfg.databaseUrl
      ? this.cfg.databaseUrl
      : path.join(directory, `store.sqlite`)

    const keyLocation = path.join(directory, `key`)
    return { directory, dbLocation, keyLocation }
  }

  async exists(did: string): Promise<boolean> {
    if (!this.usingPostgres) {
      const location = await this.getLocation(did)
      return await fileExists(location.dbLocation)
    }

    // For PostgreSQL, check if the schema exists
    const schema = await this.getSchemaName(did)
    const { dbLocation } = await this.getLocation(did)
    const { Client } = await import('pg')
    const client = new Client({ connectionString: dbLocation })
    await client.connect()
    try {
      const result = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schema],
      )
      return result.rows.length > 0
    } finally {
      await client.end()
    }
  }

  async keypair(did: string): Promise<Keypair> {
    const { keyLocation } = await this.getLocation(did)
    const privKey = await fs.readFile(keyLocation)
    return crypto.Secp256k1Keypair.import(privKey)
  }

  async openDb(did: string): Promise<ActorDb> {
    const { dbLocation } = await this.getLocation(did)

    // For SQLite, check file existence. For PostgreSQL, check schema existence
    if (!this.usingPostgres) {
      const exists = await fileExists(dbLocation)
      if (!exists) {
        throw new InvalidRequestError('Repo not found', 'NotFound')
      }
    }

    // For PostgreSQL, pass the actor-specific schema name
    const schema = this.usingPostgres ? await this.getSchemaName(did) : undefined
    const db = getDb(dbLocation, this.cfg.disableWalAutoCheckpoint, schema)

    // run a simple select with retry logic to ensure the db is ready (not in wal recovery mode)
    try {
      await retrySqlite(() =>
        db.db.selectFrom('repo_root').selectAll().execute(),
      )
    } catch (err) {
      db.close()
      throw err
    }

    return db
  }

  async read<T>(did: string, fn: (fn: ActorStoreReader) => T | PromiseLike<T>) {
    const db = await this.openDb(did)
    try {
      const getKeypair = () => this.keypair(did)
      return await fn(new ActorStoreReader(did, db, this.resources, getKeypair))
    } finally {
      db.close()
    }
  }

  async transact<T>(
    did: string,
    fn: (fn: ActorStoreTransactor) => T | PromiseLike<T>,
  ) {
    const keypair = await this.keypair(did)
    const db = await this.openDb(did)
    try {
      return await db.transaction(async (dbTxn) => {
        // For PostgreSQL, lock the repo_root row at the start of the transaction
        // to serialize concurrent transactions for the same actor (mimics SQLite behavior)
        // For SQLite, this is a no-op (SQLite serializes writes automatically)
        const isPostgres = 'schema' in db && db.schema !== undefined
        if (isPostgres) {
          await dbTxn.db
            .selectFrom('repo_root')
            .where('did', '=', did)
            .forUpdate()
            .execute()
        }

        return fn(new ActorStoreTransactor(did, dbTxn, keypair, this.resources))
      })
    } finally {
      db.close()
    }
  }

  async writeNoTransaction<T>(
    did: string,
    fn: (fn: ActorStoreWriter) => T | PromiseLike<T>,
  ) {
    const keypair = await this.keypair(did)
    const db = await this.openDb(did)
    try {
      return await fn(new ActorStoreWriter(did, db, keypair, this.resources))
    } finally {
      db.close()
    }
  }

  async create(did: string, keypair: ExportableKeypair) {
    const { directory, dbLocation, keyLocation } = await this.getLocation(did)

    await mkdir(directory, { recursive: true })

    if (!this.usingPostgres) {
      const exists = await fileExists(dbLocation)
      if (exists) {
        throw new InvalidRequestError('Repo already exists', 'AlreadyExists')
      }
    }

    const privKey = await keypair.export()
    await fs.writeFile(keyLocation, privKey)

    const schema = this.usingPostgres ? await this.getSchemaName(did) : undefined
    if (this.usingPostgres && schema) {
      const { Client } = await import('pg')
      const client = new Client({ connectionString: dbLocation })
      await client.connect()
      try {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
      } finally {
        await client.end()
      }
    }

    const db: ActorDb = getDb(dbLocation, this.cfg.disableWalAutoCheckpoint, schema)
    try {
      await db.ensureWal()
      const migrator = getMigrator(db)
      await migrator.migrateToLatestOrThrow()
    } finally {
      db.close()
    }
  }

  async destroy(did: string) {
    const blobstore = this.resources.blobstore(did)
    if (blobstore instanceof DiskBlobStore) {
      await blobstore.deleteAll()
    } else {
      const cids = await this.read(did, async (store) =>
        store.repo.blob.getBlobCids(),
      )
      await blobstore.deleteMany(cids).catch((err) => {
        blobStoreLogger.error('Failed to delete blobs', { did, cids, err })
      })
    }

    // For PostgreSQL, drop the schema. For SQLite, delete the directory
    if (this.usingPostgres) {
      const schema = await this.getSchemaName(did)
      const { dbLocation } = await this.getLocation(did)
      const { Client } = await import('pg')
      const client = new Client({ connectionString: dbLocation })
      await client.connect()
      try {
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      } finally {
        await client.end()
      }
    }

    // Always clean up keypair directory
    const { directory } = await this.getLocation(did)
    await rmIfExists(directory, true)
  }

  async reserveKeypair(did?: string): Promise<string> {
    let keyLoc: string | undefined
    if (did) {
      assertSafePathPart(did)
      keyLoc = path.join(this.reservedKeyDir, did)
      const maybeKey = await loadKey(keyLoc)
      if (maybeKey) {
        return maybeKey.did()
      }
    }
    const keypair = await crypto.Secp256k1Keypair.create({ exportable: true })
    const keyDid = keypair.did()
    keyLoc = keyLoc ?? path.join(this.reservedKeyDir, keyDid)
    await mkdir(this.reservedKeyDir, { recursive: true })
    await fs.writeFile(keyLoc, await keypair.export())
    return keyDid
  }

  async getReservedKeypair(
    signingKeyOrDid: string,
  ): Promise<ExportableKeypair | undefined> {
    return loadKey(path.join(this.reservedKeyDir, signingKeyOrDid))
  }

  async clearReservedKeypair(keyDid: string, did?: string) {
    await rmIfExists(path.join(this.reservedKeyDir, keyDid))
    if (did) {
      await rmIfExists(path.join(this.reservedKeyDir, did))
    }
  }

  async storePlcOp(did: string, op: Uint8Array) {
    const { directory } = await this.getLocation(did)
    const opLoc = path.join(directory, `did-op`)
    await fs.writeFile(opLoc, op)
  }

  async getPlcOp(did: string): Promise<Uint8Array> {
    const { directory } = await this.getLocation(did)
    const opLoc = path.join(directory, `did-op`)
    return await fs.readFile(opLoc)
  }

  async clearPlcOp(did: string) {
    const { directory } = await this.getLocation(did)
    const opLoc = path.join(directory, `did-op`)
    await rmIfExists(opLoc)
  }
}

const loadKey = async (loc: string): Promise<ExportableKeypair | undefined> => {
  const privKey = await readIfExists(loc)
  if (!privKey) return undefined
  return crypto.Secp256k1Keypair.import(privKey, { exportable: true })
}

function assertSafePathPart(part: string) {
  const normalized = path.normalize(part)
  assert(
    part === normalized &&
      !part.startsWith('.') &&
      !part.includes('/') &&
      !part.includes('\\'),
    `unsafe path part: ${part}`,
  )
}
