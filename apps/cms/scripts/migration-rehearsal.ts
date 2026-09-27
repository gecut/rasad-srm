import assert from 'node:assert/strict'
import { getPayload, createLocalReq } from 'payload'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import config from '../src/payload.config'
import { up as baseline } from '../src/migrations/20260924_083051_v1_baseline'
import { up as upgrade } from '../src/migrations/20260924_090000_v2_student_workflows'
const url = new URL(process.env.DATABASE_URL || '')
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test'))
  throw new Error('Disposable local test database required')
const payload = await getPayload({ config }),
  req = await createLocalReq({}, payload)
await baseline({ payload, req, db: payload.db.drizzle })
await payload.db.drizzle.execute(sql`
 INSERT INTO users(name,role,email) VALUES('Legacy admin','admin','legacy@example.test');
 INSERT INTO contacts(first_name,last_name,grade,lifecycle_status,readiness_status,first_attendance_at) VALUES('قدیمی','آزمون',3,'stabilizing','normal','2025-01-01');
 INSERT INTO ceremonies(title,status) VALUES('Legacy','active');
 INSERT INTO sessions(ceremony_id,starts_at,ends_at,grade,capacity,status) VALUES(1,'2030-01-01','2030-01-02',3,10,'open'),(1,'2030-02-01','2030-02-02',3,10,'open');
 INSERT INTO invitations(contact_id,session_id,inviter_id,outcome,processed_at) VALUES(1,1,1,'failed','2025-01-01'),(1,2,1,'accepted','2025-01-02');
`)
if (process.env.MIGRATION_CONFLICT_TEST === 'true')
  await payload.db.drizzle.execute(sql`UPDATE invitations SET outcome='accepted'`)
const id = await payload.db.beginTransaction()
if (!id) throw new Error('Transaction unavailable')
req.transactionID = id
const adapter = payload.db as unknown as PostgresAdapter
try {
  await upgrade({ payload, req, db: adapter.sessions[id].db })
  await payload.db.commitTransaction(id)
} catch (error) {
  await payload.db.rollbackTransaction(id)
  if (process.env.MIGRATION_CONFLICT_TEST === 'true') {
    assert.match(String(error), /Failed query|Conflicting accepted/)
    const check = await payload.db.drizzle.execute(
      sql`SELECT to_regclass('public.contacts') contacts,to_regclass('public.students') students`,
    )
    assert.ok(check.rows[0].contacts)
    assert.equal(check.rows[0].students, null)
    console.log('Conflicting accepted Sessions abort and roll back migration')
    await payload.db.pool.end()
    await payload.destroy()
    process.exit(0)
  }
  throw error
}
const result = await payload.db.drizzle.execute(
  sql`SELECT s.lifecycle_status,s.absorbed_at,i.assigned_session_id,jsonb_array_length(i.attempts) attempts FROM students s JOIN invitations i ON i.student_id=s.id`,
)
assert.equal(result.rows.length, 1)
assert.equal(result.rows[0].lifecycle_status, 'absorbed')
assert.equal(result.rows[0].assigned_session_id, 2)
assert.equal(result.rows[0].attempts, 2)
assert.equal(
  (
    await payload.db.drizzle.execute(
      sql`SELECT count(*)::int count FROM sessions WHERE status='filling'`,
    )
  ).rows[0].count,
  1,
)
assert.equal(
  (
    await payload.db.drizzle.execute(
      sql`SELECT count(*)::int count FROM rasad_v1_archive.invitations`,
    )
  ).rows[0].count,
  2,
)
console.log(
  'Migration rehearsal passed: IDs/lifecycle/date, invitation history/assignment, session ordering and archive preserved',
)
await payload.db.pool.end()
await payload.destroy()
