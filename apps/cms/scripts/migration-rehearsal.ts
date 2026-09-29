import assert from 'node:assert/strict'
import { getPayload, createLocalReq } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import config from '../src/payload.config'
import { migrations } from '../src/migrations'

const url = new URL(process.env.DATABASE_URL || '')
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test'))
  throw new Error('Disposable local test database required')
const payload = await getPayload({ config }),
  req = await createLocalReq({}, payload)
const baseline = migrations[0]?.up
if (!baseline) throw new Error('No baseline migration found')
await baseline({ payload, req, db: payload.db.drizzle })
const check = await payload.db.drizzle.execute(
  sql`SELECT to_regclass('public.students') AS students, to_regclass('public.neighborhoods') AS neighborhoods`,
)
assert.ok(check.rows[0]?.students)
assert.ok(check.rows[0]?.neighborhoods)
console.log('Baseline migration rehearsal passed')
await payload.db.pool.end()
await payload.destroy()
