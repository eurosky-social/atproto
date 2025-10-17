/**
 * PDS Test Configuration - Dual Database Testing
 *
 * This configuration runs all tests against BOTH SQLite and PostgreSQL to ensure
 * 100% compatibility between database backends.
 *
 * Usage:
 *   pnpm test              - Run all tests with both databases
 *   pnpm test:sqlite       - Run tests with SQLite only
 *   pnpm test:postgres     - Run tests with PostgreSQL only
 *
 * How it works:
 *   - Each test suite runs twice: once with SQLite, once with PostgreSQL
 *   - Projects run sequentially (maxWorkers: 1) to avoid resource contention
 *   - Each project has its own setup file that configures the database
 *   - Test results clearly show which database was used: "PDS (SQLite)" or "PDS (PostgreSQL)"
 *
 * @type {import('jest').Config}
 */

// Base configuration for both projects
const baseConfig = {
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: { '^.+\\.(t|j)s$': '@swc/jest' },
  transformIgnorePatterns: [
    `/node_modules/.pnpm/(?!(get-port|lande|toygrad)@)`,
  ],
  testTimeout: 60000,
  moduleNameMapper: { '^(\\.\\.?\\/.+)\\.js$': ['$1.ts', '$1.js'] },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.timeout.ts'],
}

const sqliteProject = {
  ...baseConfig,
  displayName: 'PDS (SQLite)',
  setupFiles: [
    '<rootDir>/../../jest.setup.ts',
    '<rootDir>/jest.setup.sqlite.ts',
  ],
}

const postgresProject = {
  ...baseConfig,
  displayName: 'PDS (PostgreSQL)',
  setupFiles: [
    '<rootDir>/../../jest.setup.ts',
    '<rootDir>/jest.setup.postgres.ts',
  ],
}

const testDbOnly = process.env.TEST_DB_ONLY
let projects = [sqliteProject, postgresProject]

if (testDbOnly === 'sqlite') {
  projects = [sqliteProject]
} else if (testDbOnly === 'postgres') {
  projects = [postgresProject]
}

module.exports = {
  // Run projects sequentially to avoid PostgreSQL connection exhaustion
  maxWorkers: 1,
  projects,
}
