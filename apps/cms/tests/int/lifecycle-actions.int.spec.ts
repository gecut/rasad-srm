import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import type { User, Class, Teacher } from '@/payload-types'
import {
  markStudentClassSeeker,
  referStudentToClass,
  markStudentAbsorbed,
  confirmStabilization,
  removeStudentFromLifecycle,
  reenterStudentLifecycle,
} from '@/domain/students/lifecycleActions'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

describe('Milestone 4 — Student Lifecycle Domain Actions', () => {
  let adminUser: User
  let employeeUser: User
  let specialistUser: User
  let inviterUser: User

  let teacher: Teacher
  let activeClass: Class
  let cancelledClass: Class

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Clean tables
    await payload.delete({ collection: 'students', where: {} })
    await payload.delete({ collection: 'classes', where: {} })
    await payload.delete({ collection: 'teachers', where: {} })
    await payload.delete({ collection: 'users', where: {} })

    // Seed test users
    adminUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm4-admin@example.com',
        name: 'M4 Admin',
        password: 'Password123!',
        role: 'admin',
        status: 'active',
      },
      overrideAccess: true,
    })

    employeeUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm4-employee@example.com',
        name: 'M4 Employee',
        password: 'Password123!',
        role: 'employee',
        status: 'active',
      },
      overrideAccess: true,
    })

    specialistUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm4-specialist@example.com',
        name: 'M4 Specialist',
        password: 'Password123!',
        role: 'follow_up_specialist',
        status: 'active',
      },
      overrideAccess: true,
    })

    inviterUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm4-inviter@example.com',
        name: 'M4 Inviter',
        password: 'Password123!',
        role: 'inviter',
        status: 'active',
        username: '09' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'),
      },
      overrideAccess: true,
    })

    teacher = await payload.create({
      collection: 'teachers',
      data: {
        firstName: 'حسین',
        lastName: 'جعفری',
        status: 'active',
      },
      overrideAccess: true,
    })

    activeClass = await payload.create({
      collection: 'classes',
      data: {
        title: 'کلاس علوم پایه سوم',
        primaryTeacher: teacher.id,
        status: 'active',
      },
      overrideAccess: true,
    })

    cancelledClass = await payload.create({
      collection: 'classes',
      data: {
        title: 'کلاس لغوشده',
        primaryTeacher: teacher.id,
        status: 'cancelled',
      },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'students', where: {} })
    await payload.delete({ collection: 'classes', where: {} })
    await payload.delete({ collection: 'teachers', where: {} })
    await payload.delete({ collection: 'users', where: {} })
  })

  // ---------------------------------------------------------------------------
  // 1. markStudentClassSeeker
  // ---------------------------------------------------------------------------
  describe('markStudentClassSeeker', () => {
    it('allows employee to move student from unknown to class_seeker', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'نوید',
          lastName: 'کمالی',
          grade: 3,
          lifecycleStatus: 'unknown',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      const res = await markStudentClassSeeker({
        studentId: student.id,
        user: employeeUser,
        payload,
      })

      expect(res.success).toBe(true)
      expect(res.student.lifecycleStatus).toBe('class_seeker')
    })

    it('denies follow-up specialist from executing markStudentClassSeeker', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'نوید',
          lastName: 'کمالی ۲',
          grade: 3,
          lifecycleStatus: 'unknown',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      await expect(
        markStudentClassSeeker({
          studentId: student.id,
          user: specialistUser,
          payload,
        }),
      ).rejects.toThrow(/اجازهٔ انجام این عملیات/)

      const adminRes = await markStudentClassSeeker({
        studentId: student.id,
        user: adminUser,
        payload,
      })
      expect(adminRes.success).toBe(true)
      expect(adminRes.student.lifecycleStatus).toBe('class_seeker')
    })
  })

  // ---------------------------------------------------------------------------
  // 2. referStudentToClass
  // ---------------------------------------------------------------------------
  describe('referStudentToClass', () => {
    it('allows employee to manually refer student to active class', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'سامان',
          lastName: 'فرهادی',
          grade: 3,
          lifecycleStatus: 'class_seeker',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      const res = await referStudentToClass({
        studentId: student.id,
        classId: activeClass.id,
        user: employeeUser,
        payload,
      })

      expect(res.success).toBe(true)
      expect(res.student.lifecycleStatus).toBe('referred_to_teacher')
      const resolvedClassId =
        typeof res.student.currentClass === 'object' && res.student.currentClass !== null
          ? res.student.currentClass.id
          : res.student.currentClass
      expect(resolvedClassId).toBe(activeClass.id)
      expect(res.student.referredAt).toBeDefined()
    })

    it('rejects referral to a cancelled class', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'سامان',
          lastName: 'فرهادی ۲',
          grade: 3,
          lifecycleStatus: 'class_seeker',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      await expect(
        referStudentToClass({
          studentId: student.id,
          classId: cancelledClass.id,
          user: employeeUser,
          payload,
        }),
      ).rejects.toThrow(/امکان ارجاع به کلاسی با وضعیت/)
    })
  })

  // ---------------------------------------------------------------------------
  // 3. markStudentAbsorbed
  // ---------------------------------------------------------------------------
  describe('markStudentAbsorbed', () => {
    it('allows follow-up specialist to confirm first attendance for referred student', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'پویا',
          lastName: 'مومنی',
          grade: 4,
          referredAt: new Date().toISOString(),
          lifecycleStatus: 'referred_to_teacher',
          currentClass: activeClass.id,
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      const res = await markStudentAbsorbed({
        studentId: student.id,
        user: specialistUser,
        payload,
      })

      expect(res.success).toBe(true)
      expect(res.student.lifecycleStatus).toBe('absorbed')
      expect(res.student.absorbedAt).toBeDefined()
    })

    it('rejects confirming first attendance if student has no current class', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'پویا',
          lastName: 'مومنی ۲',
          grade: 4,
          lifecycleStatus: 'class_seeker',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      await expect(
        markStudentAbsorbed({
          studentId: student.id,
          user: specialistUser,
          payload,
        }),
      ).rejects.toThrow(/دانش‌آموز باید ابتدا به یک کلاس ارجاع شده باشد/)
    })
  })

  // ---------------------------------------------------------------------------
  // 4. confirmStabilization
  // ---------------------------------------------------------------------------
  describe('confirmStabilization', () => {
    it('rejects stabilization if less than 6 months elapsed from absorbedAt', async () => {
      // 2 months ago (approx 60 days)
      const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'کیان',
          lastName: 'بهرامی',
          grade: 2,
          currentClass: activeClass.id,
          absorbedAt: twoMonthsAgo,
          lifecycleStatus: 'absorbed',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      await expect(
        confirmStabilization({
          studentId: student.id,
          user: specialistUser,
          payload,
        }),
      ).rejects.toThrow(/حداقل ۶ ماه/)
    })

    it('accepts stabilization when at least 6 months have elapsed and specialist confirms', async () => {
      // 7 months ago (approx 210 days)
      const sevenMonthsAgo = new Date(Date.now() - 210 * 24 * 60 * 60 * 1000).toISOString()

      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'کیان',
          lastName: 'بهرامی ۲',
          grade: 2,
          currentClass: activeClass.id,
          absorbedAt: sevenMonthsAgo,
          lifecycleStatus: 'absorbed',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      const res = await confirmStabilization({
        studentId: student.id,
        user: specialistUser,
        payload,
      })

      expect(res.success).toBe(true)
      expect(res.student.lifecycleStatus).toBe('stabilized')
      expect(res.student.stabilizedAt).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // 5. removeStudentFromLifecycle
  // ---------------------------------------------------------------------------
  describe('removeStudentFromLifecycle', () => {
    it('rejects stopping lifecycle without removedReason', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'دارا',
          lastName: 'خسروی',
          grade: 1,
          lifecycleStatus: 'referred_to_teacher',
          currentClass: activeClass.id,
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      await expect(
        removeStudentFromLifecycle({
          studentId: student.id,
          removedReason: '',
          user: specialistUser,
          payload,
        }),
      ).rejects.toThrow(/ثبت دلیل الزامی است/)
    })

    it('allows authorized specialist to stop lifecycle with reason', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'دارا',
          lastName: 'خسروی ۲',
          grade: 1,
          lifecycleStatus: 'referred_to_teacher',
          currentClass: activeClass.id,
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      const res = await removeStudentFromLifecycle({
        studentId: student.id,
        removedReason: 'عدم تمایل خانواده به ادامه کلاس',
        user: specialistUser,
        payload,
      })

      expect(res.success).toBe(true)
      expect(res.student.lifecycleStatus).toBe('removed')
      expect(res.student.removedReason).toBe('عدم تمایل خانواده به ادامه کلاس')
    })
  })

  // ---------------------------------------------------------------------------
  // 6. reenterStudentLifecycle
  // ---------------------------------------------------------------------------
  describe('reenterStudentLifecycle', () => {
    it('allows employee to reset/re-enter a removed student into the lifecycle', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'آرش',
          lastName: 'راد',
          grade: 6,
          referredAt: new Date().toISOString(),
          absorbedAt: new Date().toISOString(),
          lifecycleStatus: 'removed',
          removedReason: 'توقف قبلی',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      const res = await reenterStudentLifecycle({
        studentId: student.id,
        targetStatus: 'class_seeker',
        resetClass: true,
        user: employeeUser,
        payload,
      })

      expect(res.success).toBe(true)
      expect(res.student.lifecycleStatus).toBe('class_seeker')
      expect(res.student.currentClass).toBeNull()
      expect(res.student.removedReason).toBeNull()
      expect(res.student.absorbedAt).toBeNull()
      expect(res.student.referredAt).toBeNull()
    })

    it('denies inviter from calling lifecycle actions', async () => {
      const student = await payload.create({
        collection: 'students',
        data: {
          firstName: 'آرش',
          lastName: 'راد ۲',
          grade: 6,
          lifecycleStatus: 'unknown',
          readinessStatus: 'normal',
          origin: 'admin',
        },
        overrideAccess: true,
      })

      await expect(
        markStudentClassSeeker({
          studentId: student.id,
          user: inviterUser,
          payload,
        }),
      ).rejects.toThrow(/اجازهٔ انجام این عملیات/)
    })
  })
})
