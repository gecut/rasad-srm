import dotenv from 'dotenv'
import path from 'path'

// Explicitly load test environment from test.env — never silently load .env
dotenv.config({ path: path.resolve(process.cwd(), 'test.env') })

const testDbUrl = process.env.TEST_DATABASE_URL

if (!testDbUrl) {
  throw new Error(
    'CRITICAL TEST SAFETY ERROR: TEST_DATABASE_URL is not set.\n' +
      'Tests that interact with Payload data must never silently use the development database.\n' +
      'Please configure TEST_DATABASE_URL in test.env or your environment.\n' +
      'Example: TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/rasad_srm_test',
  )
}

const databaseName = new URL(testDbUrl).pathname.slice(1)
if (!databaseName.endsWith('_test')) throw new Error('Test database name must end in _test')
process.env.SCHEMA_PUSH = 'true'

// Ensure DATABASE_URL is strictly pointed to TEST_DATABASE_URL
process.env.DATABASE_URL = testDbUrl

if (!process.env.PAYLOAD_SECRET) {
  process.env.PAYLOAD_SECRET = 'rasad-srm-test-payload-secret-at-least-32-chars-long'
}

// Each serial suite owns fresh disposable fixtures; never truncate a non-test database.
import { beforeAll } from 'vitest'
beforeAll(async () => {
  const { getPayload } = await import('payload')
  const { sql } = await import('@payloadcms/db-postgres')
  const { default: config } = await import('./src/payload.config')
  const payload = await getPayload({ config })
  await payload.db.drizzle.execute(
    sql`TRUNCATE users, teachers, classes, students, follow_ups, ceremonies, sessions, invitations, invitation_claims, session_checkins, exports, imports, payload_jobs, payload_locked_documents, payload_preferences RESTART IDENTITY CASCADE`,
  )
}, 30000)
