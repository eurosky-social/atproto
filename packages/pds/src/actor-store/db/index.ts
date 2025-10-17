import { Database, Migrator } from '../../db'
import migrations from './migrations'
import { DatabaseSchema } from './schema'
export * from './schema'

export type ActorDb = Database<DatabaseSchema>

export const getDb = (
  location: string,
  disableWalAutoCheckpoint = false,
  schema?: string, // PostgreSQL schema name (for per-actor isolation)
): ActorDb => {
  if (location.startsWith('postgres://') || location.startsWith('postgresql://')) {
    const pgSchema = schema || process.env.PDS_ACTOR_DB_SCHEMA || 'actor'
    return Database.postgres(location, { schema: pgSchema })
  }

  const pragmas: Record<string, string> = disableWalAutoCheckpoint
    ? { wal_autocheckpoint: '0' }
    : {}
  return Database.sqlite(location, { pragmas })
}

export const getMigrator = (db: Database<DatabaseSchema>) => {
  // For PostgreSQL, pass schema to migrator for isolated migration tracking
  const schema =
    db instanceof Database && 'schema' in db ? (db as any).schema : undefined
  return schema
    ? new Migrator(db.db, migrations, { migrationTableSchema: schema })
    : new Migrator(db.db, migrations)
}
