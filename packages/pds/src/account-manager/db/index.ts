import { Database, Migrator } from '../../db'
import migrations from './migrations'
import { DatabaseSchema } from './schema'

export * from './schema'

export type AccountDb = Database<DatabaseSchema>

export const getDb = (
  location: string,
  disableWalAutoCheckpoint = false,
): AccountDb => {
  // If location is a PostgreSQL URL, use postgres dialect with schema from env or default 'account'
  if (location.startsWith('postgres://') || location.startsWith('postgresql://')) {
    const schema = process.env.PDS_ACCOUNT_DB_SCHEMA || 'account'
    return Database.postgres(location, { schema })
  }

  // Otherwise use SQLite with pragmas
  const pragmas: Record<string, string> = disableWalAutoCheckpoint
    ? { wal_autocheckpoint: '0' }
    : {}
  return Database.sqlite(location, { pragmas })
}

export const getMigrator = (db: AccountDb) => {
  // For PostgreSQL, pass schema to migrator for isolated migration tracking
  const schema =
    db instanceof Database && 'schema' in db ? (db as any).schema : undefined
  return schema
    ? new Migrator(db.db, migrations, { migrationTableSchema: schema })
    : new Migrator(db.db, migrations)
}
