import { Database, Migrator } from '../../db'
import migrations from './migrations'
import { DidCacheSchema } from './schema'

export * from './schema'

export type DidCacheDb = Database<DidCacheSchema>

export const getDb = (
  location: string,
  disableWalAutoCheckpoint = false,
): DidCacheDb => {
  // If location is a PostgreSQL URL, use postgres dialect with schema from env or default 'did_cache'
  if (location.startsWith('postgres://') || location.startsWith('postgresql://')) {
    const schema = process.env.PDS_DID_CACHE_DB_SCHEMA || 'did_cache'
    return Database.postgres(location, { schema })
  }

  const pragmas: Record<string, string> = disableWalAutoCheckpoint
    ? { wal_autocheckpoint: '0', synchronous: 'NORMAL' }
    : { synchronous: 'NORMAL' }
  return Database.sqlite(location, { pragmas })
}

export const getMigrator = (db: DidCacheDb) => {
  // For PostgreSQL, pass schema to migrator for isolated migration tracking
  const schema =
    db instanceof Database && 'schema' in db ? (db as any).schema : undefined
  return schema
    ? new Migrator(db.db, migrations, { migrationTableSchema: schema })
    : new Migrator(db.db, migrations)
}
