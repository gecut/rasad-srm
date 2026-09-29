import type { Payload } from 'payload'
import { randomUUID } from 'node:crypto'
import { advanceCeremonySession } from '@/domain/ceremonies/session-service'
export async function fixture(payload: Payload) {
  const suffix = randomUUID()
  const admin = await payload.create({
    collection: 'users',
    data: {
      name: 'مدیر',
      email: `${suffix}@test.example`,
      password: 'Password123!',
      role: 'admin',
      status: 'active',
    },
  })
  const inviter = await payload.create({
    collection: 'users',
    data: {
      name: 'دعوت',
      username: `09${Math.floor(Math.random() * 1e9)
        .toString()
        .padStart(9, '0')}`,
      password: 'Password123!',
      role: 'inviter',
      status: 'active',
    },
  })
  const ceremony = await payload.create({
    collection: 'ceremonies',
    data: { title: suffix, status: 'inviting' },
  })
  const first = await payload.create({
    collection: 'sessions',
    data: {
      ceremony: ceremony.id,
      title: 'اول',
      startsAt: '2030-03-21T12:00:00Z',
      status: 'queued',
    },
  })
  const second = await payload.create({
    collection: 'sessions',
    data: {
      ceremony: ceremony.id,
      title: 'دوم',
      startsAt: '2030-03-22T12:00:00Z',
      status: 'queued',
    },
  })
  await advanceCeremonySession({
    payload,
    user: admin,
    ceremonyId: ceremony.id,
    expectedSessionId: null,
  })
  const student = await payload.create({
    collection: 'students',
    data: {
      firstName: 'آزمون',
      lastName: suffix,
      mobile: '09121112233',
      origin: 'admin',
      readinessStatus: 'normal',
      lifecycleStatus: 'unknown',
    },
  })
  return { admin, inviter, ceremony, first, second, student }
}
