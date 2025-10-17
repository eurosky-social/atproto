import assert from 'node:assert'
import SqliteDB from 'better-sqlite3'
import {
  Kysely,
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  RootOperationNode,
  SqliteDialect,
  PostgresDialect,
  UnknownRow,
  sql,
} from 'kysely'
import { Pool } from 'pg'
import { dbLogger } from '../logger'
import { retrySqlite } from './util'

const DEFAULT_PRAGMAS = {
  // strict: 'ON', // @TODO strictness should live on table defs instead
}

export class Database<Schema> {
  destroyed = false
  commitHooks: CommitHook[] = []

  constructor(public db: Kysely<Schema>) {}

  static sqlite<T>(
    location: string,
    opts?: { pragmas?: Record<string, string> },
  ): Database<T> {
    const sqliteDb = new SqliteDB(location, {
      timeout: 0, // handled by application
    })
    const pragmas = {
      ...DEFAULT_PRAGMAS,
      ...(opts?.pragmas ?? {}),
    }
    for (const pragma of Object.keys(pragmas)) {
      sqliteDb.pragma(`${pragma} = ${pragmas[pragma]}`)
    }
    const db = new Kysely<T>({
      dialect: new SqliteDialect({
        database: sqliteDb,
      }),
    })
    return new Database(db)
  }

  static postgres<T>(
    url: string,
    opts?: { max?: number; schema?: string },
  ): Database<T> {
    const schema = opts?.schema

    // Validate schema name (alphanumeric and underscore only)
    if (schema && !/^[a-z_][a-z0-9_]*$/i.test(schema)) {
      throw new Error(
        `PostgreSQL schema must only contain [A-Za-z0-9_]: ${schema}`,
      )
    }

    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined
    const defaultPoolSize = isTest ? 1 : 10
    const poolSize =
      opts?.max ??
      (process.env.PDS_POOL_SIZE ? parseInt(process.env.PDS_POOL_SIZE, 10) : defaultPoolSize)

    const pool = new Pool({
      connectionString: url,
      max: poolSize,
    })

    // Set search_path on each connection for schema isolation
    if (schema) {
      pool.on('connect', (client) => {
        // Shared objects such as extensions will go in the public schema
        client.query(`SET search_path TO "${schema}",public;`)
      })
    }
    const db = new Kysely<T>({
      dialect: new PostgresDialect({
        pool,
      }),
    })
    return new DatabasePostgres(db, pool, schema)
  }

  async ensureWal() {
    await sql`PRAGMA journal_mode = WAL`.execute(this.db)
  }

  async transactionNoRetry<T>(
    fn: (db: Database<Schema>) => T | PromiseLike<T>,
  ): Promise<T> {
    this.assertNotTransaction()
    const leakyTxPlugin = new LeakyTxPlugin()
    const { hooks, txRes } = await this.db
      .withPlugin(leakyTxPlugin)
      .transaction()
      .execute(async (txn) => {
        const dbTxn = new Database(txn)
        try {
          const txRes = await fn(dbTxn)
          leakyTxPlugin.endTx()
          const hooks = dbTxn.commitHooks
          return { hooks, txRes }
        } catch (err) {
          leakyTxPlugin.endTx()
          // ensure that all in-flight queries are flushed & the connection is open
          await txn.getExecutor().provideConnection(async () => {})
          throw err
        }
      })
    hooks.map((hook) => hook())
    return txRes
  }

  async transaction<T>(
    fn: (db: Database<Schema>) => T | PromiseLike<T>,
  ): Promise<T> {
    return retrySqlite(() => this.transactionNoRetry(fn))
  }

  async executeWithRetry<T>(query: { execute: () => Promise<T> }) {
    if (this.isTransaction) {
      // transaction() ensures retry on entire transaction, no need to retry individual statements.
      return query.execute()
    }
    return retrySqlite(() => query.execute())
  }

  onCommit(fn: () => void) {
    this.assertTransaction()
    this.commitHooks.push(fn)
  }

  get isTransaction() {
    return this.db.isTransaction
  }

  assertTransaction() {
    assert(this.isTransaction, 'Transaction required')
  }

  assertNotTransaction() {
    assert(!this.isTransaction, 'Cannot be in a transaction')
  }

  close(): void {
    if (this.destroyed) return
    this.db
      .destroy()
      .then(() => (this.destroyed = true))
      .catch((err) => dbLogger.error({ err }, 'error closing db'))
  }
}

class DatabasePostgres<Schema> extends Database<Schema> {
  private pool: Pool

  constructor(
    db: Kysely<Schema>,
    pool: Pool,
    public schema?: string,
  ) {
    super(db)
    this.pool = pool
  }

  async ensureWal() {
    // PostgreSQL uses WAL by default - no-op
  }

  close(): void {
    if (this.destroyed) return
    this.db
      .destroy()
      .then(() => {
        // Close PostgreSQL connection pool
        if (this.pool) {
          return this.pool.end()
        }
      })
      .then(() => (this.destroyed = true))
      .catch((err) => dbLogger.error({ err }, 'error closing db'))
  }
}

type CommitHook = () => void

class LeakyTxPlugin implements KyselyPlugin {
  private txOver = false

  endTx() {
    this.txOver = true
  }

  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    if (this.txOver) {
      throw new Error('tx already failed')
    }
    return args.node
  }

  async transformResult(
    args: PluginTransformResultArgs,
  ): Promise<QueryResult<UnknownRow>> {
    return args.result
  }
}
