import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import type { User, Student, FollowUp } from '@/payload-types'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

describe('Milestone 3 — Follow-ups Domain', () => {
  let adminUser: User
  let employeeUser: User
  let specialistUser: User
  let inviterUser: User
  let testStudent: Student

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Clean tables
    await payload.delete({ collection: 'follow-ups', where: {} })
    await payload.delete({ collection: 'students', where: {} })
    await payload.delete({ collection: 'users', where: {} })

    // Seed test users
    adminUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm3-admin@example.com',
        name: 'M3 Admin',
        password: 'Password123!',
        role: 'admin',
        status: 'active',
      },
      overrideAccess: true,
    })

    employeeUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm3-employee@example.com',
        name: 'M3 Employee',
        password: 'Password123!',
        role: 'employee',
        status: 'active',
      },
      overrideAccess: true,
    })

    specialistUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm3-specialist@example.com',
        name: 'M3 Specialist',
        password: 'Password123!',
        role: 'follow_up_specialist',
        status: 'active',
      },
      overrideAccess: true,
    })

    inviterUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm3-inviter@example.com',
        name: 'M3 Inviter',
        password: 'Password123!',
        role: 'inviter',
        status: 'active',
        username: '09' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'),
      },
      overrideAccess: true,
    })

    testStudent = await payload.create({
      collection: 'students',
      data: {
        firstName: 'رضا',
        lastName: 'قاسمی',
        grade: 2,
        lifecycleStatus: 'unknown',
        readinessStatus: 'normal',
        origin: 'admin',
      },
      overrideAccess: false,
      user: employeeUser,
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'follow-ups', where: {} })
    await payload.delete({ collection: 'students', where: {} })
    await payload.delete({ collection: 'users', where: {} })
  })

  // ---------------------------------------------------------------------------
  // Creation and Multi-note Append
  // ---------------------------------------------------------------------------
  describe('Follow-up Creation & Append Pattern', () => {
    it('allows follow-up specialist to record a note with auto-assigned specialist', async () => {
      const followUp = await payload.create({
        collection: 'follow-ups',
        data: {
          student: testStudent.id,
          note: 'تماس با ولی برقرار شد. اشتیاق خوبی برای شروع کلاس دارند.',
        } as unknown as FollowUp,
        overrideAccess: false,
        user: specialistUser,
      })

      expect(followUp.id).toBeDefined()
      expect(followUp.note).toContain('تماس با ولی برقرار شد')
      expect(
        typeof followUp.specialist === 'object' ? followUp.specialist.id : followUp.specialist,
      ).toBe(specialistUser.id)
      expect(followUp.createdAt).toBeDefined()
    })

    it('allows recording a second follow-up for the same student (multiple textual records)', async () => {
      const secondFollowUp = await payload.create({
        collection: 'follow-ups',
        data: {
          student: testStudent.id,
          note: 'پیگیری دوم: هماهنگی تاریخ حضور اولیه انجام شد.',
        } as unknown as FollowUp,
        overrideAccess: false,
        user: specialistUser,
      })

      expect(secondFollowUp.id).toBeDefined()

      const allFollowUps = await payload.find({
        collection: 'follow-ups',
        where: {
          student: { equals: testStudent.id },
        },
        overrideAccess: false,
        user: specialistUser,
      })

      expect(allFollowUps.docs.length).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // Specialist Role Validation
  // ---------------------------------------------------------------------------
  describe('Specialist Role Validation', () => {
    it('rejects setting an inviter as follow-up specialist', async () => {
      await expect(
        payload.create({
          collection: 'follow-ups',
          data: {
            student: testStudent.id,
            specialist: inviterUser.id,
            note: 'یادداشت با کارشناس نامعتبر',
          },
          overrideAccess: false,
          user: adminUser,
        }),
      ).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // Access Control
  // ---------------------------------------------------------------------------
  describe('Access Control', () => {
    it('allows follow-up specialist to read follow-up records', async () => {
      const result = await payload.find({
        collection: 'follow-ups',
        overrideAccess: false,
        user: specialistUser,
      })
      expect(result.docs.length).toBeGreaterThanOrEqual(1)
    })

    it('denies follow-up specialist from deleting follow-ups', async () => {
      const followUps = await payload.find({
        collection: 'follow-ups',
        overrideAccess: true,
      })
      const targetId = followUps.docs[0].id

      await expect(
        payload.delete({
          collection: 'follow-ups',
          id: targetId,
          overrideAccess: false,
          user: specialistUser,
        }),
      ).rejects.toThrow()
    })

    it('denies inviter from reading or creating follow-ups', async () => {
      await expect(
        payload.find({
          collection: 'follow-ups',
          overrideAccess: false,
          user: inviterUser,
        }),
      ).rejects.toThrow()

      await expect(
        payload.create({
          collection: 'follow-ups',
          data: {
            student: testStudent.id,
            note: 'اقدام غیرمجاز دعوت‌کننده',
          } as unknown as FollowUp,
          overrideAccess: false,
          user: inviterUser,
        }),
      ).rejects.toThrow()
    })
  })
})
