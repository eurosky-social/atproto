import dotenv from 'dotenv'

dotenv.config({ path: './test.env' })

const defaultPostgresUrl = 'postgresql://pg:password@127.0.0.1:5433/postgres'
process.env.DB_POSTGRES_URL = process.env.DB_POSTGRES_URL || defaultPostgresUrl

delete process.env.DATABASE_URL

process.env.TEST_DATABASE_TYPE = 'postgres'
