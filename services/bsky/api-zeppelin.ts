// Based on: https://github.com/zeppelin-social/atproto/blob/main/services/bsky/api.js
//
// Single-process appview: boots the dataplane and the firehose indexer, which
// upstream deploys as separate services, alongside the api server in one
// container against one postgres. Env vars on top of ./README.md:
//
//   BSKY_DB_POSTGRES_URL     (required) postgres holding the appview index
//   BSKY_DB_POSTGRES_SCHEMA  schema holding the appview tables
//   BSKY_DB_POOL_SIZE        appview pool size
//   BSKY_DATAPLANE_PORT      (required) loopback port for the in-process dataplane
//   BSKY_REPO_PROVIDER       (required) firehose to index, e.g. wss://pds.example.com
//   BSKY_REPO_SUBSCRIPTION_CONCURRENCY  firehose queue cap (default: 25)
//
// Unlike earlier revisions this does not stand up its own bsync: upstream
// removed the in-process mock, so BSKY_BSYNC_URL must point at a real bsync
// (the `services/bsync` image) for mutes, bookmarks, drafts and notification
// declarations to work.
import assert from 'node:assert'
import cluster from 'node:cluster'
import {
  BskyAppView,
  BsyncSubscription,
  DataPlaneServer,
  Database,
  RepoSubscription,
  ServerConfig,
} from '@atproto/bsky'
import { Secp256k1Keypair } from '@atproto/crypto'

const main = async () => {
  const env = getEnv()
  const config = ServerConfig.readEnv()
  assert(env.serviceSigningKey, 'must set BSKY_SERVICE_SIGNING_KEY')
  const signingKey = await Secp256k1Keypair.import(env.serviceSigningKey)

  // forked from upstream:
  assert(env.dbPostgresUrl, 'must set BSKY_DB_POSTGRES_URL')

  const migrationDb = new Database({
    url: env.dbPostgresUrl,
    schema: env.dbPostgresSchema,
  })
  await migrationDb.migrateToLatestOrThrow()
  await migrationDb.close()

  const db = new Database({
    url: env.dbPostgresUrl,
    schema: env.dbPostgresSchema,
    poolSize: env.dbPoolSize,
  })

  // mirrors the wiring in packages/dev-env/src/bsky.ts
  assert(env.dataplanePort, 'must set BSKY_DATAPLANE_PORT')

  const dataplane = await DataPlaneServer.create(
    db,
    env.dataplanePort,
    config.didPlcUrl,
  )

  const server = BskyAppView.create({ config, signingKey })

  // Applies the mutes, notification declarations and stash records written to
  // bsync back into the appview's own tables.
  const bsyncSub = new BsyncSubscription({ db, config })

  assert(env.repoProvider, 'must set BSKY_REPO_PROVIDER')

  const sub = new RepoSubscription({
    service: env.repoProvider,
    db,
    idResolver: dataplane.idResolver,
  })

  await server.start()

  bsyncSub.start()
  void sub.start()
  capBackfillConcurrency(sub, env.repoSubscriptionConcurrency ?? 25)

  // Graceful shutdown (see also https://aws.amazon.com/blogs/containers/graceful-shutdowns-with-ecs/)
  const shutdown = async () => {
    await sub.destroy()
    await bsyncSub.destroy()
    await server.destroy()
    await dataplane.destroy()
    await db.close()
  }

  // end fork

  process.on('SIGTERM', shutdown)
  process.on('disconnect', shutdown) // when clustering
}

// RepoSubscription builds its MemoryRunner with unbounded concurrency, so a
// startCursor:0 backfill buffers the PDS's whole history into the heap and
// OOMs. There is no constructor seam, and the runner it creates in start() is
// private, so reach through it — p-queue's concurrency is a live setter. Throws
// rather than silently skipping the cap if an upstream sync moves things.
const capBackfillConcurrency = (sub: RepoSubscription, concurrency: number) => {
  const mainQueue = (
    sub as unknown as {
      current?: { runner?: { mainQueue?: { concurrency: number } } }
    }
  ).current?.runner?.mainQueue
  assert(
    mainQueue,
    'cannot reach RepoSubscription runner queue: upstream internals changed',
  )
  mainQueue.concurrency = concurrency
}

const getEnv = () => ({
  serviceSigningKey: process.env.BSKY_SERVICE_SIGNING_KEY || undefined,
  // forked:
  dbPostgresUrl: process.env.BSKY_DB_POSTGRES_URL || undefined,
  dbPostgresSchema: process.env.BSKY_DB_POSTGRES_SCHEMA || undefined,
  dbPoolSize: maybeParseInt(process.env.BSKY_DB_POOL_SIZE) || undefined,
  dataplanePort: maybeParseInt(process.env.BSKY_DATAPLANE_PORT) || undefined,
  migration: process.env.ENABLE_MIGRATIONS === 'true' || undefined,
  repoProvider: process.env.BSKY_REPO_PROVIDER || undefined,
  repoSubscriptionConcurrency:
    maybeParseInt(process.env.BSKY_REPO_SUBSCRIPTION_CONCURRENCY) || undefined,
})

const maybeParseInt = (str: string | undefined) => {
  if (!str) return
  const int = parseInt(str, 10)
  if (isNaN(int)) return
  return int
}

const workerCount = maybeParseInt(process.env.CLUSTER_WORKER_COUNT)

if (workerCount) {
  if (cluster.isPrimary) {
    console.log(`primary ${process.pid} is running`)
    const workers = new Set<ReturnType<typeof cluster.fork>>()
    for (let i = 0; i < workerCount; ++i) {
      workers.add(cluster.fork())
    }
    let teardown = false
    cluster.on('exit', (worker) => {
      workers.delete(worker)
      if (!teardown) {
        workers.add(cluster.fork()) // restart on crash
      }
    })
    process.on('SIGTERM', () => {
      teardown = true
      console.log('disconnecting workers')
      workers.forEach((w) => w.disconnect())
    })
  } else {
    console.log(`worker ${process.pid} is running`)
    main()
  }
} else {
  main() // non-clustering
}
