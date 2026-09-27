import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import type { User, Teacher, Class } from '@/payload-types'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

describe('Milestone 1 — Teachers and Classes Domain', () => {
  let adminUser: User
  let employeeUser: User
  let specialistUser: User
  let inviterUser: User

  let createdTeacher: Teacher

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Clean test database tables
    await payload.delete({ collection: 'classes', where: {} })
    await payload.delete({ collection: 'teachers', where: {} })
    await payload.delete({ collection: 'users', where: {} })

    // Seed test users
    adminUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm1-admin@example.com',
        name: 'M1 Admin',
        password: 'Password123!',
        role: 'admin',
        status: 'active',
      },
      overrideAccess: true,
    })

    employeeUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm1-employee@example.com',
        name: 'M1 Employee',
        password: 'Password123!',
        role: 'employee',
        status: 'active',
      },
      overrideAccess: true,
    })

    specialistUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm1-specialist@example.com',
        name: 'M1 Specialist',
        password: 'Password123!',
        role: 'follow_up_specialist',
        status: 'active',
      },
      overrideAccess: true,
    })

    inviterUser = await payload.create({
      collection: 'users',
      data: {
        email: 'm1-inviter@example.com',
        name: 'M1 Inviter',
        password: 'Password123!',
        role: 'inviter',
        status: 'active',
        username: '09' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'),
      },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'classes', where: {} })
    await payload.delete({ collection: 'teachers', where: {} })
    await payload.delete({ collection: 'users', where: {} })
  })

  // ---------------------------------------------------------------------------
  // Teachers Collection Tests
  // ---------------------------------------------------------------------------
  describe('Teachers Collection', () => {
    it('allows employee to create an active teacher', async () => {
      createdTeacher = await payload.create({
        collection: 'teachers',
        data: {
          firstName: 'علی',
          lastName: 'محمدی',
          mobile: '09123456789',
          status: 'active',
        },
        overrideAccess: false,
        user: employeeUser,
      })

      expect(createdTeacher.id).toBeDefined()
      expect(createdTeacher.firstName).toBe('علی')
      expect(createdTeacher.lastName).toBe('محمدی')
      expect(createdTeacher.status).toBe('active')
    })

    it('allows follow-up specialist to read teachers', async () => {
      const result = await payload.find({
        collection: 'teachers',
        where: { id: { equals: createdTeacher.id } },
        overrideAccess: false,
        user: specialistUser,
      })

      expect(result.docs.length).toBe(1)
      expect(result.docs[0].id).toBe(createdTeacher.id)
    })

    it('denies follow-up specialist from creating or updating teachers', async () => {
      await expect(
        payload.create({
          collection: 'teachers',
          data: {
            firstName: 'رضا',
            lastName: 'علوی',
            status: 'active',
          },
          overrideAccess: false,
          user: specialistUser,
        }),
      ).rejects.toThrow()

      await expect(
        payload.update({
          collection: 'teachers',
          id: createdTeacher.id,
          data: {
            status: 'inactive',
          },
          overrideAccess: false,
          user: specialistUser,
        }),
      ).rejects.toThrow()
    })

    it('denies inviter from reading teachers', async () => {
      await expect(
        payload.find({
          collection: 'teachers',
          overrideAccess: false,
          user: inviterUser,
        }),
      ).rejects.toThrow()
    })

    it('rejects creation without required fields', async () => {
      await expect(
        // @ts-expect-error testing missing required fields
        payload.create({
          collection: 'teachers',
          data: {
            mobile: '09120000000',
          },
          overrideAccess: false,
          user: adminUser,
        }),
      ).rejects.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // Classes Collection Tests
  // ---------------------------------------------------------------------------
  describe('Classes Collection', () => {
    let assistantTeacher: Teacher
    let createdClass: Class

    beforeAll(async () => {
      assistantTeacher = await payload.create({
        collection: 'teachers',
        data: {
          firstName: 'سارا',
          lastName: 'کریمی',
          mobile: '09129876543',
          status: 'active',
        },
        overrideAccess: false,
        user: adminUser,
      })
    })

    it('allows employee to create a class with primary and assistant teachers', async () => {
      createdClass = await payload.create({
        collection: 'classes',
        data: {
          title: 'کلاس ریاضی پایه اول',
          primaryTeacher: createdTeacher.id,
          assistantTeachers: [assistantTeacher.id],
          capacity: 25,
          status: 'planned',
        },
        overrideAccess: false,
        user: employeeUser,
      })

      expect(createdClass.id).toBeDefined()
      expect(createdClass.title).toBe('کلاس ریاضی پایه اول')
      expect(createdClass.capacity).toBe(25)
      expect(createdClass.status).toBe('planned')
    })

    it('allows follow-up specialist to read classes', async () => {
      const result = await payload.find({
        collection: 'classes',
        where: { id: { equals: createdClass.id } },
        overrideAccess: false,
        user: specialistUser,
      })

      expect(result.docs.length).toBe(1)
      expect(result.docs[0].id).toBe(createdClass.id)
    })

    it('denies follow-up specialist from creating or updating classes', async () => {
      await expect(
        payload.create({
          collection: 'classes',
          data: {
            title: 'کلاس غیرمجاز',
            primaryTeacher: createdTeacher.id,
            status: 'active',
          },
          overrideAccess: false,
          user: specialistUser,
        }),
      ).rejects.toThrow()

      await expect(
        payload.update({
          collection: 'classes',
          id: createdClass.id,
          data: {
            status: 'active',
          },
          overrideAccess: false,
          user: specialistUser,
        }),
      ).rejects.toThrow()
    })

    it('denies inviter from reading classes', async () => {
      await expect(
        payload.find({
          collection: 'classes',
          overrideAccess: false,
          user: inviterUser,
        }),
      ).rejects.toThrow()
    })

    it('rejects class creation without a primary teacher', async () => {
      await expect(
        // @ts-expect-error testing missing primaryTeacher
        payload.create({
          collection: 'classes',
          data: {
            title: 'کلاس بدون مدرس',
            status: 'planned',
          },
          overrideAccess: false,
          user: adminUser,
        }),
      ).rejects.toThrow()
    })
  })
})
