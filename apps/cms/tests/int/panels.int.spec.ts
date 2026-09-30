import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import config from '@/payload.config'
import type { User } from '@/payload-types'
import { getTeacherRoster, updateTeacherStudent } from '@/domain/teacher/teacher-service'
import {
  checkInStudent,
  quickCreateAndCheckInStudent,
  searchReceptionStudents,
} from '@/domain/reception/reception-service'

describe('Teacher and reception server boundaries', () => {
  let payload: Payload
  let teacher: User, otherTeacher: User, receptionist: User
  let classId: number, sessionId: number, teacherId: number, ceremonyId: number
  const suffix = randomUUID()

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // Ensure bootstrap promotion never changes a panel fixture's role.
    await payload.create({
      collection: 'users',
      data: {
        name: 'Panel admin',
        email: `admin-${suffix}@example.test`,
        password: 'TestPassword123!',
        role: 'admin',
        status: 'active',
      },
    })
    const profile = await payload.create({
      collection: 'teachers',
      data: { firstName: 'مدرس', lastName: suffix, status: 'active' },
    })
    const other = await payload.create({
      collection: 'teachers',
      data: { firstName: 'مدرس دیگر', lastName: suffix, status: 'active' },
    })
    teacherId = profile.id
    const phone = () =>
      `09${Math.floor(Math.random() * 1e9)
        .toString()
        .padStart(9, '0')}`
    teacher = await payload.create({
      collection: 'users',
      data: {
        name: 'Teacher',
        username: phone(),
        password: 'TestPassword123!',
        role: 'teacher',
        teacherProfile: profile.id,
        status: 'active',
      },
    })
    otherTeacher = await payload.create({
      collection: 'users',
      data: {
        name: 'Other teacher',
        username: phone(),
        password: 'TestPassword123!',
        role: 'teacher',
        teacherProfile: other.id,
        status: 'active',
      },
    })
    receptionist = await payload.create({
      collection: 'users',
      data: {
        name: 'Reception',
        username: phone(),
        password: 'TestPassword123!',
        role: 'receptionist',
        status: 'active',
      },
    })
    const classroom = await payload.create({
      collection: 'classes',
      data: { title: suffix, primaryTeacher: profile.id, status: 'active' },
    })
    classId = classroom.id
    const ceremony = await payload.create({
      collection: 'ceremonies',
      data: { title: suffix, status: 'active' },
    })
    ceremonyId = ceremony.id
    const session = await payload.create({
      collection: 'sessions',
      data: {
        ceremony: ceremony.id,
        title: suffix,
        status: 'active',
        startsAt: new Date().toISOString(),
      },
    })
    sessionId = session.id
  })

  async function student() {
    return payload.create({
      collection: 'students',
      data: {
        firstName: 'دانش‌آموز',
        lastName: randomUUID(),
        currentClass: classId,
        lifecycleStatus: 'referred_to_teacher',
        readinessStatus: 'normal',
        origin: 'admin',
      },
    })
  }

  it('scopes roster and denies a different primary teacher', async () => {
    const target = await student()
    const own = await getTeacherRoster({ payload, user: teacher })
    expect(
      own.classes.find((item) => item.id === classId)?.students.map((item) => item.id),
    ).toContain(target.id)
    expect((await getTeacherRoster({ payload, user: otherTeacher })).classes).toHaveLength(0)
    await expect(
      updateTeacherStudent({
        payload,
        user: otherTeacher,
        studentId: target.id,
        status: 'absorbed',
      }),
    ).rejects.toMatchObject({ status: 403 })
    expect(
      await updateTeacherStudent({
        payload,
        user: teacher,
        studentId: target.id,
        status: 'absorbed',
      }),
    ).toMatchObject({ lifecycleStatus: 'absorbed' })
    const updated = await payload.findByID({ collection: 'students', id: target.id })
    expect(updated.absorbedAt).toBeTruthy()
    await expect(
      updateTeacherStudent({
        payload,
        user: teacher,
        studentId: target.id,
        status: 'removed',
        reason: '',
      }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('revalidates the current profile and current class owner', async () => {
    const target = await student()
    await payload.update({ collection: 'teachers', id: teacherId, data: { status: 'inactive' } })
    await expect(
      updateTeacherStudent({ payload, user: teacher, studentId: target.id, status: 'absorbed' }),
    ).rejects.toMatchObject({ status: 403 })
    await payload.update({ collection: 'teachers', id: teacherId, data: { status: 'active' } })
    await payload.update({
      collection: 'students',
      id: target.id,
      data: { currentClass: null, lifecycleStatus: 'unknown' },
    })
    await expect(
      updateTeacherStudent({ payload, user: teacher, studentId: target.id, status: 'absorbed' }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('enforces receptionist collection and action boundaries', async () => {
    await expect(
      payload.find({ collection: 'students', user: receptionist, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(getTeacherRoster({ payload, user: receptionist })).rejects.toMatchObject({
      status: 403,
    })
    await expect(
      searchReceptionStudents({ payload, user: teacher, sessionId, q: 'دانش' }),
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      searchReceptionStudents({ payload, user: receptionist, sessionId, q: '' }),
    ).rejects.toMatchObject({ status: 422 })
    const result = await searchReceptionStudents({
      payload,
      user: receptionist,
      sessionId,
      q: 'دانش',
    })
    expect(result.students.length).toBeLessThanOrEqual(20)
    for (const item of result.students) {
      expect(item).toHaveProperty('firstName')
      expect(item).toHaveProperty('lastName')
    }
  })

  it('records attendance in a different session without rewriting the accepted invitation', async () => {
    const target = await student()
    const assigned = await payload.create({
      collection: 'sessions',
      data: {
        ceremony: ceremonyId,
        title: 'سانس دیگر',
        startsAt: new Date().toISOString(),
        status: 'sealed',
      },
    })
    const invitation = await payload.create({
      collection: 'invitations',
      data: {
        student: target.id,
        ceremony: ceremonyId,
        assignedSession: assigned.id,
        processedSession: assigned.id,
        inviter: receptionist.id,
        outcome: 'accepted',
        processedAt: new Date().toISOString(),
      },
    })
    const result = await checkInStudent({
      payload,
      user: receptionist,
      studentId: target.id,
      sessionId,
    })
    expect(result.differentSession).toBe(true)
    expect((await payload.findByID({ collection: 'session-checkins', id: result.id })).source).toBe(
      'invited',
    )
    const unchanged = await payload.findByID({
      collection: 'invitations',
      id: invitation.id,
      depth: 0,
    })
    expect(unchanged.assignedSession).toBe(assigned.id)
  })

  it('serializes concurrent duplicate check-ins', async () => {
    const target = await student()
    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        checkInStudent({ payload, user: receptionist, studentId: target.id, sessionId }),
      ),
    )
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    for (const result of results)
      if (result.status === 'rejected') expect(result.reason).toMatchObject({ status: 409 })
    const count = await payload.count({
      collection: 'session-checkins',
      where: { and: [{ student: { equals: target.id } }, { session: { equals: sessionId } }] },
    })
    expect(count.totalDocs).toBe(1)
  })

  it('rejects unauthenticated and stale deactivated identities', async () => {
    await expect(getTeacherRoster({ payload, user: null })).rejects.toMatchObject({ status: 401 })
    await expect(
      checkInStudent({ payload, user: teacher, sessionId, studentId: (await student()).id }),
    ).rejects.toMatchObject({ status: 403 })
    await payload.update({ collection: 'users', id: receptionist.id, data: { status: 'inactive' } })
    try {
      await expect(
        searchReceptionStudents({ payload, user: receptionist, sessionId, q: 'دانش' }),
      ).rejects.toMatchObject({ status: 403 })
    } finally {
      await payload.update({ collection: 'users', id: receptionist.id, data: { status: 'active' } })
    }
  })

  it('allows students with shared phone numbers (e.g. siblings) to be registered and checked in', async () => {
    const mobile = `09${Math.floor(Math.random() * 1e9)
      .toString()
      .padStart(9, '0')}`
    const results = await Promise.allSettled([
      quickCreateAndCheckInStudent({
        payload,
        user: receptionist,
        sessionId,
        firstName: 'اول',
        lastName: randomUUID(),
        mobile,
      }),
      quickCreateAndCheckInStudent({
        payload,
        user: receptionist,
        sessionId,
        firstName: 'دوم',
        lastName: randomUUID(),
        motherMobile: `+98${mobile.slice(1)}`,
      }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2)
    const count = await payload.count({
      collection: 'students',
      where: { or: [{ mobile: { equals: mobile } }, { motherMobile: { equals: mobile } }] },
    })
    expect(count.totalDocs).toBe(2)
  })

  it('rolls back a newly created student if check-in persistence fails', async () => {
    const lastName = randomUUID()
    const originalCreate = payload.create.bind(payload)
    const create = vi
      .spyOn(payload, 'create')
      .mockImplementationOnce(originalCreate)
      .mockRejectedValueOnce(new Error('Simulated check-in persistence failure'))
    try {
      await expect(
        quickCreateAndCheckInStudent({
          payload,
          user: receptionist,
          sessionId,
          firstName: 'بازگشت',
          lastName,
        }),
      ).rejects.toThrow('Simulated check-in persistence failure')
    } finally {
      create.mockRestore()
    }
    expect(
      (
        await payload.count({
          collection: 'students',
          where: { lastName: { equals: lastName } },
        })
      ).totalDocs,
    ).toBe(0)
  })

  it('serializes quick creation and rolls back creation for invalid sessions', async () => {
    const lastName = randomUUID()
    const input = { payload, user: receptionist, sessionId, firstName: 'علي', lastName }
    const results = await Promise.allSettled([
      quickCreateAndCheckInStudent(input),
      quickCreateAndCheckInStudent({ ...input, firstName: 'علی' }),
    ])
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((item) => item.status === 'rejected')
    expect(rejected?.status === 'rejected' && rejected.reason).toMatchObject({ status: 409 })
    expect(
      (await payload.count({ collection: 'students', where: { lastName: { equals: lastName } } }))
        .totalDocs,
    ).toBe(1)
    await payload.update({ collection: 'sessions', id: sessionId, data: { status: 'completed' } })
    const absentName = randomUUID()
    await expect(
      quickCreateAndCheckInStudent({ ...input, lastName: absentName }),
    ).rejects.toMatchObject({ status: 409 })
    expect(
      (await payload.count({ collection: 'students', where: { lastName: { equals: absentName } } }))
        .totalDocs,
    ).toBe(0)
    await payload.update({ collection: 'sessions', id: sessionId, data: { status: 'active' } })
  })
})
