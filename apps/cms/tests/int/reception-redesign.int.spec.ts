import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, it, expect } from 'vitest'
import { fixture } from '../helpers/v2'
import {
  checkInStudent,
  quickCreateAndCheckInStudent,
  updateReceptionStudent,
} from '@/domain/reception/reception-service'

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('Reception redesign features', () => {
  it('allows quick editing of student contact and details', async () => {
    const f = await fixture(payload)
    const updateResult = await updateReceptionStudent({
      payload,
      user: f.admin,
      sessionId: f.first.id,
      studentId: f.student.id,
      mobile: '09123334455',
      grade: 5,
      notes: 'یادداشت جدید پذیرش',
    })

    expect(updateResult.student.mobile).toBe('09123334455')
    expect(updateResult.student.grade).toBe(5)
    expect(updateResult.student.notes).toBe('یادداشت جدید پذیرش')

    const reloaded = await payload.findByID({ collection: 'students', id: f.student.id })
    expect(reloaded.mobile).toBe('09123334455')
    expect(reloaded.grade).toBe(5)
  })

  it('allows sibling walk-in registration with shared phone numbers when allowSharedPhone is true', async () => {
    const f = await fixture(payload)
    const sharedFatherPhone = '09129998877'

    // First sibling
    await quickCreateAndCheckInStudent({
      payload,
      user: f.admin,
      sessionId: f.first.id,
      firstName: 'برادر',
      lastName: 'اول',
      fatherMobile: sharedFatherPhone,
      allowSharedPhone: true,
    })

    // Second sibling with same father mobile
    const secondSiblingResult = await quickCreateAndCheckInStudent({
      payload,
      user: f.admin,
      sessionId: f.first.id,
      firstName: 'برادر',
      lastName: 'دوم',
      fatherMobile: sharedFatherPhone,
      allowSharedPhone: true,
    })

    expect(secondSiblingResult.studentId).toBeDefined()
    const student = await payload.findByID({
      collection: 'students',
      id: secondSiblingResult.studentId,
    })
    expect(student.firstName).toBe('برادر')
    expect(student.lastName).toBe('دوم')
    expect(student.fatherMobile).toBe(sharedFatherPhone)
  })

  it('enforces single attendance policy and prevents duplicate check-in to second session unless forceOverride is true', async () => {
    const f = await fixture(payload)

    // Check into first session
    await checkInStudent({
      payload,
      user: f.admin,
      sessionId: f.first.id,
      studentId: f.student.id,
    })

    // Make second session active for reception
    await payload.update({
      collection: 'sessions',
      id: f.second.id,
      data: { status: 'active' },
    })

    // Attempt check-in to second session of same ceremony without override -> 409
    await expect(
      checkInStudent({
        payload,
        user: f.admin,
        sessionId: f.second.id,
        studentId: f.student.id,
      }),
    ).rejects.toThrow('این دانش‌آموز قبلاً در یکی از سانس‌های این مراسم حضور یافته است.')

    // With forceOverride: true, check-in succeeds
    const overrideResult = await checkInStudent({
      payload,
      user: f.admin,
      sessionId: f.second.id,
      studentId: f.student.id,
      forceOverride: true,
    })
    expect(overrideResult.id).toBeDefined()
  })
})
