import { getPayload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import config from '../src/payload.config'
import { advanceCeremonySession } from '../src/domain/ceremonies/session-service'
const url = new URL(process.env.DATABASE_URL || '')
if (!url.pathname.endsWith('_test')) throw new Error('Test DB required')
const p = await getPayload({ config })
await p.db.drizzle.execute(
  sql`TRUNCATE users, teachers, classes, students, follow_ups, ceremonies, sessions, invitations, invitation_claims, session_checkins, payload_jobs, payload_locked_documents, payload_preferences RESTART IDENTITY CASCADE`,
)
const admin = await p.create({
  collection: 'users',
  data: {
    name: 'مدیر آزمون',
    email: 'e2e-admin@example.test',
    username: '09120000001',
    password: 'TestPassword123!',
    status: 'active',
    role: 'admin',
  },
})
const teacher = await p.create({
  collection: 'teachers',
  data: { firstName: 'مدرس', lastName: 'آزمون', status: 'active' },
})
const classroom = await p.create({
  collection: 'classes',
  data: { title: 'کلاس آزمون', primaryTeacher: teacher.id, status: 'active' },
})
for (const [role, username] of [
  ['inviter', '09120000002'],
  ['teacher', '09120000003'],
  ['receptionist', '09120000004'],
] as const)
  await p.create({
    collection: 'users',
    data: {
      name: role,
      username,
      password: 'TestPassword123!',
      role,
      status: 'active',
      ...(role === 'teacher' ? { teacherProfile: teacher.id } : {}),
    },
  })
await p.create({
  collection: 'students',
  data: {
    firstName: 'دانش',
    lastName: 'آزمون',
    mobile: '09123334455',
    currentClass: classroom.id,
    lifecycleStatus: 'referred_to_teacher',
    readinessStatus: 'normal',
    origin: 'admin',
  },
})
const ceremony = await p.create({
  collection: 'ceremonies',
  data: { title: 'مراسم آزمون', status: 'inviting' },
})
await p.create({
  collection: 'sessions',
  data: {
    ceremony: ceremony.id,
    title: 'سانس اول',
    startsAt: '2030-03-21T12:00:00Z',
    status: 'queued',
  },
})
await advanceCeremonySession({
  payload: p,
  user: admin,
  ceremonyId: ceremony.id,
  expectedSessionId: null,
})
console.log('E2E fixtures ready')
// Payload may retain background handles; all fixture writes above are awaited.
process.exit(0)
