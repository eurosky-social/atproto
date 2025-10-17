import dotenv from 'dotenv'

dotenv.config({ path: './test.env' })

delete process.env.DATABASE_URL
delete process.env.DB_POSTGRES_URL
delete process.env.DB_TEST_POSTGRES_URL
delete process.env.PDS_ACCOUNT_DB_SCHEMA
delete process.env.PDS_ACTOR_DB_SCHEMA
delete process.env.PDS_SEQUENCER_DB_SCHEMA
delete process.env.PDS_DID_CACHE_DB_SCHEMA

process.env.TEST_DATABASE_TYPE = 'sqlite'
