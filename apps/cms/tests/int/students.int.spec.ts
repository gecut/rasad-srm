import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import type { User, Student } from '@/payload-types'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

describe('Milestone 2 — Students Domain', () => {
  let adminUser: User
  let employeeUser: User
  let specialistUser: User
  let inviterUser: User

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Clean test tables
    await payload.delete({ collection: 'students', where: {} })
    await payload.delete({ collection: 'users', where: {} })

    // Seed test users
    adminUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm2-admin@example.com',
        name: 'M2 Admin',
        password: 'Password123!',
        role: 'admin',
        status: 'active',
      },
      overrideAccess: true,
    })

    employeeUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm2-employee@example.com',
        name: 'M2 Employee',
        password: 'Password123!',
        role: 'employee',
        status: 'active',
      },
      overrideAccess: true,
    })

    specialistUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm2-specialist@example.com',
        name: 'M2 Specialist',
        password: 'Password123!',
        role: 'follow_up_specialist',
        status: 'active',
      },
      overrideAccess: true,
    })

    inviterUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm2-inviter@example.com',
        name: 'M2 Inviter',
        password: 'Password123!',
        role: 'inviter',
        status: 'active',
        username: '09' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'),
      },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'students', where: {} })
    await payload.delete({ collection: 'users', where: {} })
  })

  // ---------------------------------------------------------------------------
  // Student Creation & Defaults
  // ---------------------------------------------------------------------------
  describe('Creation and Defaults', () => {
    it('creates student with default lifecycle=unknown and readiness=normal', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'مهدی',
          lastName: 'رضایی',
          grade: 4,
          mobile: '09121111111',
          motherMobile: '09122222222',
          fatherMobile: '09123333333',
        } as unknown as Student,
        overrideAccess: false,
        user: employeeUser,
      })

      expect(student.id).toBeDefined()
      expect(student.firstName).toBe('مهدی')
      expect(student.lastName).toBe('رضایی')
      expect(student.grade).toBe(4)
      expect(student.lifecycleStatus).toBe('unknown')
      expect(student.readinessStatus).toBe('normal')
      expect(student.currentClass).toBeFalsy()
    })
  })

  // ---------------------------------------------------------------------------
  // Grade Validation (Integer 1..6)
  // ---------------------------------------------------------------------------
  describe('Grade Validation (1..6)', () => {
    it('accepts grades 1 through 6', async () => {
      for (const grade of [1, 2, 3, 4, 5, 6]) {
        const student = await payload.create({
          collection: 'students',
          data: {
            firstName: `دانش‌آموز`,
            lastName: `پایه ${grade}`,
            grade,
            lifecycleStatus: 'unknown',
            readinessStatus: 'normal',
            origin: 'admin',
          },
          overrideAccess: false,
          user: adminUser,
        })
        expect(student.grade).toBe(grade)
      }
    })

    it('rejects grade less than 1', async () => {
      await expect(
        payload.create({
          collection: 'students',
          data: {
            firstName: 'نامعتبر',
            lastName: 'پایه صفر',
            grade: 0,
            lifecycleStatus: 'unknown',
            readinessStatus: 'normal',
            origin: 'admin',
          },
          overrideAccess: false,
          user: adminUser,
        }),
      ).rejects.toThrow()
    })

    it('rejects grade greater than 6', async () => {
      await expect(
        payload.create({
          collection: 'students',
          data: {
            firstName: 'نامعتبر',
            lastName: 'پایه هفت',
            grade: 7,
            lifecycleStatus: 'unknown',
            readinessStatus: 'normal',
            origin: 'admin',
          },
          overrideAccess: false,
          user: adminUser,
        }),
      ).rejects.toThrow()
    })

    it('rejects non-integer grade', async () => {
      await expect(
        payload.create({
          collection: 'students',
          data: {
            firstName: 'نامعتبر',
            lastName: 'پایه اعشاری',
            grade: 3.5,
            lifecycleStatus: 'unknown',
            readinessStatus: 'normal',
            origin: 'admin',
          },
          overrideAccess: false,
          user: adminUser,
        }),
      ).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // Readiness vs Lifecycle Independence
  // ---------------------------------------------------------------------------
  describe('Readiness & Lifecycle Independence', () => {
    it('allows student to be both class_seeker and waitlisted (پشت‌خطی)', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'سجاد',
          lastName: 'حسینی',
          grade: 3,
          lifecycleStatus: 'class_seeker',
          readinessStatus: 'waitlisted',
          origin: 'admin',
        },
        overrideAccess: false,
        user: employeeUser,
      })

      expect(student.lifecycleStatus).toBe('class_seeker')
      expect(student.readinessStatus).toBe('waitlisted')
    })
  })

  // ---------------------------------------------------------------------------
  // Stop Reason Invariant
  // ---------------------------------------------------------------------------
  describe('Stop Reason Validation', () => {
    it('rejects removed lifecycle if removedReason is missing or empty', async () => {
      await expect(
        payload.create({
          collection: 'students',
          data: {
            firstName: 'امیر',
            lastName: 'صادقی',
            grade: 2,
            lifecycleStatus: 'removed',
            readinessStatus: 'normal',
            origin: 'admin',
          },
          overrideAccess: false,
          user: adminUser,
        }),
      ).rejects.toThrow()

      await expect(
        payload.create({
          collection: 'students',
          data: {
            firstName: 'امیر',
            lastName: 'صادقی',
            grade: 2,
            lifecycleStatus: 'removed',
            readinessStatus: 'normal',
            origin: 'admin',
            removedReason: '   ',
          },
          overrideAccess: false,
          user: adminUser,
        }),
      ).rejects.toThrow()
    })

    it('accepts removed lifecycle when removedReason is provided', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'امیر',
          lastName: 'صادقی',
          grade: 2,
          lifecycleStatus: 'removed',
          readinessStatus: 'normal',
          origin: 'admin',
          removedReason: 'تغییر محل سکونت به شهر دیگر',
        },
        overrideAccess: false,
        user: adminUser,
      })

      expect(student.lifecycleStatus).toBe('removed')
      expect(student.removedReason).toBe('تغییر محل سکونت به شهر دیگر')
    })
  })

  // ---------------------------------------------------------------------------
  // Stabilization Invariant
  // ---------------------------------------------------------------------------
  describe('Stabilization Invariant', () => {
    it('rejects stabilized lifecycle if absorbedAt is missing', async () => {
      await expect(
        payload.create({
          collection: 'students',
          data: {
            firstName: 'تثبیت',
            lastName: 'ناقص',
            grade: 5,
            lifecycleStatus: 'stabilized',
            readinessStatus: 'normal',
            origin: 'admin',
          },
          overrideAccess: false,
          user: adminUser,
        }),
      ).rejects.toThrow()
    })

    it('rejects stabilized lifecycle if less than 6 months have elapsed since absorbedAt', async () => {
      // 1 month ago
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      await expect(
        payload.create({
          collection: 'students',
          data: {
            firstName: 'تثبیت',
            lastName: 'زودرس',
            grade: 5,
            absorbedAt: oneMonthAgo,
            lifecycleStatus: 'stabilized',
            readinessStatus: 'normal',
            origin: 'admin',
          },
          overrideAccess: false,
          user: adminUser,
        }),
      ).rejects.toThrow()
    })

    it('allows stabilized lifecycle if at least 6 months have elapsed since absorbedAt', async () => {
      // 7 months ago (approx 210 days)
      const sevenMonthsAgo = new Date(Date.now() - 210 * 24 * 60 * 60 * 1000).toISOString()

      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'تثبیت',
          lastName: 'موفق',
          grade: 5,
          absorbedAt: sevenMonthsAgo,
          lifecycleStatus: 'stabilized',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: false,
        user: adminUser,
      })

      expect(student.lifecycleStatus).toBe('stabilized')
      expect(student.stabilizedAt).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Access Control
  // ---------------------------------------------------------------------------
  describe('Access Control', () => {
    let testStudent: Student

    beforeAll(async () => {
      testStudent = await payload.create({
        collection: 'students',
        data: {
          firstName: 'سینا',
          lastName: 'نادری',
          grade: 1,
          lifecycleStatus: 'unknown',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: false,
        user: employeeUser,
      })
    })

    it('allows follow-up specialist to read students', async () => {
      const res = await payload.find({
        collection: 'students',
        where: { id: { equals: testStudent.id } },
        overrideAccess: false,
        user: specialistUser,
      })
      expect(res.docs.length).toBe(1)
      expect(res.docs[0].id).toBe(testStudent.id)
    })

    it('allows follow-up specialist to update lifecycle status to removed with reason', async () => {
      const updated = await payload.update({
        collection: 'students',
        id: testStudent.id,
        data: {
          lifecycleStatus: 'removed',
          removedReason: 'عدم پاسخگویی در چندین تماس',
        },
        overrideAccess: false,
        user: specialistUser,
      })
      expect(updated.lifecycleStatus).toBe('removed')
    })

    it('prevents follow-up specialist from modifying identity fields', async () => {
      const result = await payload.update({
        collection: 'students',
        id: testStudent.id,
        data: {
          firstName: 'نام جدید غیرمجاز',
        },
        overrideAccess: false,
        user: specialistUser,
      })
      // Field-level access protection ensures unauthorized field is stripped and original value is preserved
      expect(result.firstName).toBe('سینا')

      const fresh = await payload.findByID({
        collection: 'students',
        id: testStudent.id,
        overrideAccess: true,
      })
      expect(fresh.firstName).toBe('سینا')
    })

    it('denies inviter from browsing students directly', async () => {
      await expect(
        payload.find({
          collection: 'students',
          overrideAccess: false,
          user: inviterUser,
        }),
      ).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // Intelligent Lifecycle Transitions & Admin Ergonomics
  // ---------------------------------------------------------------------------
  describe('Intelligent Lifecycle Transitions & Admin Ergonomics', () => {
    let activeClassId: number

    beforeAll(async () => {
      const teacher = await payload.create({
        collection: 'teachers',
        data: {
          firstName: 'حمید',
          lastName: 'کمالی',
          status: 'active',
        },
        overrideAccess: true,
      })

      const cls = await payload.create({
        collection: 'classes',
        data: {
          title: 'کلاس تست ارجاع هوشمند',
          primaryTeacher: teacher.id,
          status: 'active',
        },
        overrideAccess: true,
      })
      activeClassId = cls.id
    })

    it('auto-transitions unknown student to referred_to_teacher and sets referredAt upon class assignment', async () => {
      const student = await payload.create({
        collection: 'students',
        draft: false,
        data: {
          firstName: 'سهراب',
          lastName: 'سپهری',
          grade: 4,
          origin: 'admin',
        } as unknown as Student,
        overrideAccess: true,
      })

      expect(student.lifecycleStatus).toBe('unknown')
      expect(student.currentClass).toBeFalsy()

      const updated = await payload.update({
        collection: 'students',
        id: student.id,
        data: {
          currentClass: activeClassId,
        },
        overrideAccess: true,
      })

      expect(updated.lifecycleStatus).toBe('referred_to_teacher')
      expect(updated.referredAt).toBeDefined()
      const updatedClassId =
        typeof updated.currentClass === 'object' && updated.currentClass !== null
          ? updated.currentClass.id
          : updated.currentClass
      expect(updatedClassId).toBe(activeClassId)
    })

    it('gracefully transitions referred_to_teacher to class_seeker when class is unassigned', async () => {
      const student = await payload.create({
        collection: 'students',
        draft: false,
        data: {
          firstName: 'پروین',
          lastName: 'اعتصامی',
          grade: 5,
          currentClass: activeClassId,
          origin: 'admin',
        } as unknown as Student,
        overrideAccess: true,
      })

      expect(student.lifecycleStatus).toBe('referred_to_teacher')

      const updated = await payload.update({
        collection: 'students',
        id: student.id,
        data: {
          currentClass: null,
        },
        overrideAccess: true,
      })

      expect(updated.lifecycleStatus).toBe('class_seeker')
      expect(updated.referredAt).toBeNull()
      expect(updated.currentClass).toBeNull()
    })

    it('re-assigning class to class_seeker student transitions back to referred_to_teacher', async () => {
      const student = await payload.create({
        collection: 'students',
        draft: false,
        data: {
          firstName: 'نیما',
          lastName: 'یوشیج',
          grade: 6,
          lifecycleStatus: 'class_seeker',
          origin: 'admin',
        } as unknown as Student,
        overrideAccess: true,
      })

      const updated = await payload.update({
        collection: 'students',
        id: student.id,
        data: {
          currentClass: activeClassId,
        },
        overrideAccess: true,
      })

      expect(updated.lifecycleStatus).toBe('referred_to_teacher')
      expect(updated.referredAt).toBeDefined()
    })

    it('does NOT downgrade or throw error when updating profile of absorbed student', async () => {
      const absorbedTime = new Date().toISOString()
      const student = await payload.create({
        collection: 'students',
        draft: false,
        data: {
          firstName: 'فردوسی',
          lastName: 'طوسی',
          grade: 6,
          currentClass: activeClassId,
          absorbedAt: absorbedTime,
          lifecycleStatus: 'absorbed',
          origin: 'admin',
        } as unknown as Student,
        overrideAccess: true,
      })

      expect(student.lifecycleStatus).toBe('absorbed')

      const updated = await payload.update({
        collection: 'students',
        id: student.id,
        data: {
          notes: 'دانش‌آموز کوشا و پیگیر',
          address: 'مشهد، توس',
        },
        overrideAccess: true,
      })

      expect(updated.lifecycleStatus).toBe('absorbed')
      expect(updated.absorbedAt).toBe(absorbedTime)
      expect(updated.notes).toBe('دانش‌آموز کوشا و پیگیر')
    })

    it('clears removedReason when reactivating removed student', async () => {
      const student = await payload.create({
        collection: 'students',
        draft: false,
        data: {
          firstName: 'سعدی',
          lastName: 'شیرازی',
          grade: 3,
          lifecycleStatus: 'removed',
          removedReason: 'عدم پاسخگویی',
          origin: 'admin',
        } as unknown as Student,
        overrideAccess: true,
      })

      expect(student.lifecycleStatus).toBe('removed')
      expect(student.removedReason).toBe('عدم پاسخگویی')

      const reactivated = await payload.update({
        collection: 'students',
        id: student.id,
        data: {
          lifecycleStatus: 'class_seeker',
        },
        overrideAccess: true,
      })

      expect(reactivated.lifecycleStatus).toBe('class_seeker')
      expect(reactivated.removedReason).toBeNull()
    })

    it('computes virtual fullName field when reading student document', async () => {
      const student = await payload.create({
        collection: 'students',
        draft: false,
        data: {
          firstName: 'حافظ',
          lastName: 'شیرازی',
          grade: 4,
          origin: 'admin',
        } as unknown as Student,
        overrideAccess: true,
      })

      const fetched = await payload.findByID({
        collection: 'students',
        id: student.id,
        overrideAccess: true,
      })

      expect(fetched.fullName).toBe('حافظ شیرازی')
    })
  })
})
