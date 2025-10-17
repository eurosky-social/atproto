import { Database, Migrator } from '../../db'
import migrations from './migrations'
import { SequencerDbSchema } from './schema'

export * from './schema'

export type SequencerDb = Database<SequencerDbSchema>

export const getDb = (
  location: string,
  disableWalAutoCheckpoint = false,
): SequencerDb => {
  // If location is a PostgreSQL URL, use postgres dialect with schema from env or default 'sequencer'
  if (location.startsWith('postgres://') || location.startsWith('postgresql://')) {
    const schema = process.env.PDS_SEQUENCER_DB_SCHEMA || 'sequencer'
    return Database.postgres(location, { schema })
  }

  const pragmas: Record<string, string> = disableWalAutoCheckpoint
    ? { wal_autocheckpoint: '0' }
    : {}
  return Database.sqlite(location, { pragmas })
}

export const getMigrator = (db: Database<SequencerDbSchema>) => {
  // For PostgreSQL, pass schema to migrator for isolated migration tracking
  const schema =
    db instanceof Database && 'schema' in db ? (db as any).schema : undefined
  return schema
    ? new Migrator(db.db, migrations, { migrationTableSchema: schema })
    : new Migrator(db.db, migrations)
}
