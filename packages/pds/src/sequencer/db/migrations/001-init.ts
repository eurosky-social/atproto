import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  const isPostgres = !!process.env.DB_POSTGRES_URL || !!process.env.DATABASE_URL?.startsWith('postgres')

  let repoSeqTable = db.schema.createTable('repo_seq')

  // Add auto-incrementing seq column (dialect-specific)
  if (isPostgres) {
    repoSeqTable = repoSeqTable
      .addColumn('seq', 'serial', (col) => col.primaryKey())
      .addColumn('did', 'varchar', (col) => col.notNull())
      .addColumn('eventType', 'varchar', (col) => col.notNull())
      .addColumn('event', sql`bytea`, (col) => col.notNull())
  } else {
    repoSeqTable = repoSeqTable
      .addColumn('seq', 'integer', (col) => col.autoIncrement().primaryKey())
      .addColumn('did', 'varchar', (col) => col.notNull())
      .addColumn('eventType', 'varchar', (col) => col.notNull())
      .addColumn('event', 'blob', (col) => col.notNull())
  }

  await repoSeqTable
    .addColumn('invalidated', 'int2', (col) => col.notNull().defaultTo(0))
    .addColumn('sequencedAt', 'varchar', (col) => col.notNull())
    .execute()
  // for filtering seqs based on did
  await db.schema
    .createIndex('repo_seq_did_idx')
    .on('repo_seq')
    .column('did')
    .execute()
  // for filtering seqs based on event type
  await db.schema
    .createIndex('repo_seq_event_type_idx')
    .on('repo_seq')
    .column('eventType')
    .execute()
  // for entering into the seq stream at a particular time
  await db.schema
    .createIndex('repo_seq_sequenced_at_index')
    .on('repo_seq')
    .column('sequencedAt')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('repo_seq').execute()
}
