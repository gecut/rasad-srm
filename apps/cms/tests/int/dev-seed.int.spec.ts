import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import config from '@/payload.config'
import {
  accounts,
  password,
  readSeed,
  seedDevelopment,
  verifySeed,
} from '../../scripts/dev-seed/fixtures'
import { assertSeedTarget } from '../../scripts/dev-seed/safety'
import { relationID } from '@/domain/shared/core'
import { getTeacherRoster, updateTeacherStudent } from '@/domain/teacher/teacherService'
import { searchReceptionStudents, checkInStudent } from '@/domain/reception/receptionService'
import {
  getNextCeremonyInvite,
  submitInvitationOutcome,
} from '@/domain/invitations/invitationService'
import { advanceCeremonySession } from '@/domain/ceremonies/sessionService'

const safe: NodeJS.ProcessEnv = {
  DATABASE_URL: 'postgresql://postgres@127.0.0.1:55439/rasad_seed_test',
  PAYLOAD_SECRET: 'development-secret',
  NODE_ENV: 'test',
}
describe('Development seed safety and real workflows', () => {
  let payload: Payload
  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  it('accepts only explicit local development targets and no destructive flags', () => {
    expect(() => assertSeedTarget(safe, [])).not.toThrow()
    for (const DATABASE_URL of [
      'postgresql://postgres@remote.example/rasad_test',
      'postgresql://postgres@localhost/rasad_production_test',
      'postgresql://postgres@localhost/rasad_srm',
      'postgresql://postgres@localhost/other_test',
      'postgresql://postgres@localhost/rasad_test?host=production.example',
      'not-a-url',
    ])
      expect(() => assertSeedTarget({ ...safe, DATABASE_URL }, [])).toThrow()
    expect(() => assertSeedTarget({ ...safe, NODE_ENV: 'production' }, [])).toThrow()
    expect(() => assertSeedTarget({ ...safe, APP_ENV: 'staging' }, [])).toThrow()
    expect(() => assertSeedTarget({ ...safe, PAYLOAD_SECRET: '' }, [])).toThrow()
    expect(() => assertSeedTarget(safe, ['--reset'])).toThrow()
  })

  it('rolls back all fixture writes if a later record fails', async () => {
    const original = payload.create.bind(payload)
    const spy = vi.spyOn(payload, 'create').mockImplementation(async (options) => {
      if (options.collection === 'follow-ups') throw new Error('Injected seed failure')
      return original(options)
    })
    try {
      await expect(seedDevelopment(payload)).rejects.toThrow('Injected seed failure')
    } finally {
      spy.mockRestore()
    }
    expect((await payload.count({ collection: 'students' })).totalDocs).toBe(0)
    expect((await payload.count({ collection: 'users' })).totalDocs).toBe(0)
    expect((await payload.count({ collection: 'teachers' })).totalDocs).toBe(0)
  }, 30000)

  it('is repeatable, preserves unrelated/manual data, and leaves all panels actionable', async () => {
    const unrelated = await payload.create({
      collection: 'students',
      data: {
        firstName: 'پرونده',
        lastName: 'موجود مستقل',
        lifecycleStatus: 'unknown',
        readinessStatus: 'normal',
        origin: 'admin',
      },
    })
    expect(await seedDevelopment(payload)).toBe('created')
    const seeded = await verifySeed(payload)
    expect(await seedDevelopment(payload)).toBe('unchanged')
    expect(await readSeed(payload)).toEqual(seeded)
    expect(await payload.findByID({ collection: 'students', id: unrelated.id })).toMatchObject({
      lastName: 'موجود مستقل',
    })
    expect((await payload.count({ collection: 'payload-jobs' })).totalDocs).toBe(0)
    expect((await payload.count({ collection: 'invitation-claims' })).totalDocs).toBe(0)
    for (const account of accounts) {
      const login = await payload.login({
        collection: 'users',
        data: { username: account.phone, password },
      })
      expect(login.user?.role).toBe(account.role)
    }
    const { users, students, ceremonies, sessions } = seeded
    const admin = users.find((u) => u.role === 'admin')!
    const teachers = users.filter((u) => u.role === 'teacher')
    const inviter = users.filter((u) => u.role === 'inviter')
    const receptionist = users.find((u) => u.role === 'receptionist')!
    const rosters = await Promise.all(teachers.map((user) => getTeacherRoster({ payload, user })))
    expect(rosters[0].classes.length).toBeGreaterThan(1)
    expect(
      rosters[0].classes.some((c) => rosters[1].classes.some((other) => other.id === c.id)),
    ).toBe(false)
    const own = rosters[0].classes
      .flatMap((c) => c.students)
      .find((s) => s.lifecycleStatus === 'referred_to_teacher')!
    await expect(
      updateTeacherStudent({ payload, user: teachers[1], studentId: own.id, status: 'absorbed' }),
    ).rejects.toMatchObject({ status: 403 })
    await updateTeacherStudent({
      payload,
      user: teachers[0],
      studentId: own.id,
      status: 'absorbed',
    })
    const ceremony = ceremonies.find((c) => c.status === 'inviting')!
    const filling = sessions.find(
      (s) => relationID(s.ceremony) === ceremony.id && s.status === 'filling',
    )!
    const sealed = sessions.find(
      (s) => relationID(s.ceremony) === ceremony.id && s.status === 'sealed',
    )!
    const matches = await searchReceptionStudents({
      payload,
      user: receptionist,
      sessionId: filling.id,
      q: 'علی رضایی',
    })
    expect(matches.students.length).toBe(2)
    const wrongSession = await searchReceptionStudents({
      payload,
      user: receptionist,
      sessionId: filling.id,
      q: students[2].mobile!,
    })
    expect(wrongSession.students[0]).toMatchObject({
      checkedIn: false,
      assignedSessionId: sealed.id,
    })
    await expect(
      checkInStudent({
        payload,
        user: receptionist,
        studentId: students[0].id,
        sessionId: sealed.id,
      }),
    ).rejects.toMatchObject({ status: 409 })
    expect(
      await checkInStudent({
        payload,
        user: receptionist,
        studentId: students[2].id,
        sessionId: filling.id,
      }),
    ).toMatchObject({ differentSession: true })
    const [first, second] = await Promise.all(
      inviter.map((user) => getNextCeremonyInvite({ payload, user, ceremonyId: ceremony.id })),
    )
    expect(first.claim).toBeTruthy()
    expect(second.claim).toBeTruthy()
    expect(first.claim!.student.id).not.toBe(second.claim!.student.id)
    expect([first.claim!.student.id, second.claim!.student.id]).toContain(students[7].id)
    expect([first.claim!.student.id, second.claim!.student.id]).not.toContain(students[8].id)
    await advanceCeremonySession({
      payload,
      user: admin,
      ceremonyId: ceremony.id,
      expectedSessionId: filling.id,
    })
    await expect(
      submitInvitationOutcome({
        payload,
        user: inviter[0],
        ceremonyId: ceremony.id,
        sessionId: filling.id,
        claimToken: first.claim!.token,
        outcome: 'accepted',
      }),
    ).rejects.toMatchObject({ status: 409 })
    expect(await seedDevelopment(payload)).toBe('unchanged')
    expect((await payload.findByID({ collection: 'students', id: own.id })).lifecycleStatus).toBe(
      'absorbed',
    )
  }, 60000)
})
