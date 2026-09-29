import { getPayload, Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'
import { Users } from '@/collections/users'
import type { User } from '@/payload-types'
import { registerFirstUserOperation } from 'payload'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

describe('Phase 0 Auth & Access Control', () => {
  let adminUser: User
  let employeeUser: User
  let followUpUser: User
  let inviterUser: User

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Clean slate in the isolated test database
    await payload.delete({
      collection: 'users',
      where: {},
    })
  })

  afterAll(async () => {
    // Clean up created test data
    await payload.delete({
      collection: 'users',
      where: {},
    })
  })

  // -------------------------------------------------------------------------
  // 1. First-admin / Bootstrap Behavior
  // -------------------------------------------------------------------------
  describe('1. First-admin Bootstrap Behavior', () => {
    it('creates the first user as an admin even if requested with a lower role', async () => {
      // System currently has zero users
      const initialCount = await payload.count({ collection: 'users' })
      expect(initialCount.totalDocs).toBe(0)

      // Creating the first user — even if role is passed as 'employee'
      const firstUser = await payload.create({
        collection: 'users',
        data: {
          email: 'bootstrap-admin@example.com',
          name: 'Bootstrap Admin',
          password: 'AdminPassword123!',
          role: 'employee',
          status: 'active',
        },
        overrideAccess: true,
      })

      // The beforeChange hook guarantees the first user is promoted to 'admin'
      expect(firstUser.role).toBe('admin')
      adminUser = firstUser
    })

    it('rejects subsequent first-user registrations once an admin exists', async () => {
      // With at least one user existing, registerFirstUserOperation must throw Forbidden
      const collection = payload.collections['users']
      const mockReq = {
        payload,
        t: (key: string) => key,
        data: {
          email: 'another-user@example.com',
          password: 'Password123!',
          name: 'Another User',
        },
      } as unknown as PayloadRequest

      await expect(
        registerFirstUserOperation({
          collection,
          data: {
            email: 'another-user@example.com',
            password: 'Password123!',
            name: 'Another User',
            role: 'employee',
            status: 'active',
          },
          req: mockReq,
        }),
      ).rejects.toThrow()
    })

    it('ensures unauthenticated user cannot create users via standard API after bootstrap', async () => {
      await expect(
        payload.create({
          collection: 'users',
          data: {
            email: 'unauth-created@example.com',
            name: 'Unauth Created',
            password: 'Password123!',
            role: 'admin',
            status: 'active',
          },
          overrideAccess: false,
          user: undefined,
        }),
      ).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // 2-5. Admin Panel Access per Role
  // -------------------------------------------------------------------------
  describe('2-5. Admin Panel Access Control (access.admin)', () => {
    beforeAll(async () => {
      // Seed remaining roles as admin
      employeeUser = await payload.create({
        collection: 'users',
        data: {
          email: 'employee@example.com',
          name: 'Employee User',
          password: 'EmployeePassword123!',
          role: 'employee',
          status: 'active',
        },
        overrideAccess: false,
        user: adminUser,
      })

      followUpUser = await payload.create({
        collection: 'users',
        data: {
          email: 'followup@example.com',
          name: 'Follow-up User',
          password: 'FollowUpPassword123!',
          role: 'follow_up_specialist',
          status: 'active',
        },
        overrideAccess: false,
        user: adminUser,
      })

      inviterUser = await payload.create({
        collection: 'users',
        data: {
          email: 'inviter@example.com',
          name: 'Inviter User',
          password: 'InviterPassword123!',
          role: 'inviter',
          status: 'active',
          username: '09' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'),
        },
        overrideAccess: false,
        user: adminUser,
      })
    })

    it('admin -> allowed access to Admin Panel', () => {
      const allowed = Users.access?.admin?.({
        req: { user: adminUser } as unknown as PayloadRequest,
      })
      expect(allowed).toBe(true)
    })

    it('employee -> allowed access to Admin Panel', () => {
      const allowed = Users.access?.admin?.({
        req: { user: employeeUser } as unknown as PayloadRequest,
      })
      expect(allowed).toBe(true)
    })

    it('follow_up_specialist -> allowed access to Admin Panel', () => {
      const allowed = Users.access?.admin?.({
        req: { user: followUpUser } as unknown as PayloadRequest,
      })
      expect(allowed).toBe(true)
    })

    it('inviter -> denied access to Admin Panel', () => {
      const allowed = Users.access?.admin?.({
        req: { user: inviterUser } as unknown as PayloadRequest,
      })
      expect(allowed).toBe(false)
    })

    it('unauthenticated -> denied access to Admin Panel', () => {
      const allowed = Users.access?.admin?.({
        req: { user: null } as unknown as PayloadRequest,
      })
      expect(allowed).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // 6. Inviter Can Authenticate Even Though Admin Panel Is Denied
  // -------------------------------------------------------------------------
  describe('6. Inviter Authentication', () => {
    it('allows inviter to authenticate and receive token', async () => {
      const loginResult = await payload.login({
        collection: 'users',
        data: {
          email: 'inviter@example.com',
          password: 'InviterPassword123!',
        },
      })

      expect(loginResult.token).toBeDefined()
      expect(loginResult.user).toBeDefined()
      expect(loginResult.user?.email).toBe('inviter@example.com')
      expect(loginResult.user?.role).toBe('inviter')
    })
  })

  // -------------------------------------------------------------------------
  // 7-8. Role Escalation Protection
  // -------------------------------------------------------------------------
  describe('7-8. Role Escalation Protection', () => {
    it('prevents non-admin from updating their own role', async () => {
      await expect(
        payload.update({
          collection: 'users',
          id: employeeUser.id,
          data: {
            role: 'admin',
            status: 'active',
          },
          overrideAccess: false,
          user: employeeUser,
        }),
      ).rejects.toThrow()

      // Verify role did not change
      const freshDoc = await payload.findByID({
        collection: 'users',
        id: employeeUser.id,
        overrideAccess: true,
      })
      expect(freshDoc.role).toBe('employee')
    })

    it('prevents non-admin from changing another users role', async () => {
      await expect(
        payload.update({
          collection: 'users',
          id: inviterUser.id,
          data: {
            role: 'admin',
            status: 'active',
          },
          overrideAccess: false,
          user: employeeUser,
        }),
      ).rejects.toThrow()
    })

    it('prevents non-admin from creating an elevated user (or any user)', async () => {
      await expect(
        payload.create({
          collection: 'users',
          data: {
            email: 'malicious-admin@example.com',
            name: 'Malicious Admin',
            password: 'Password123!',
            role: 'admin',
            status: 'active',
          },
          overrideAccess: false,
          user: employeeUser,
        }),
      ).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // 9. Admin Authorized User Operations
  // -------------------------------------------------------------------------
  describe('9. Admin Authorized User Operations', () => {
    it('admin can create, read, update, and delete users', async () => {
      // 1. Create
      const newUser = await payload.create({
        collection: 'users',
        data: {
          email: 'temp-staff@example.com',
          name: 'Temp Staff',
          password: 'Password123!',
          role: 'employee',
          status: 'active',
        },
        overrideAccess: false,
        user: adminUser,
      })
      expect(newUser.id).toBeDefined()
      expect(newUser.email).toBe('temp-staff@example.com')

      // 2. Read
      const findResult = await payload.find({
        collection: 'users',
        where: {
          id: { equals: newUser.id },
        },
        overrideAccess: false,
        user: adminUser,
      })
      expect(findResult.docs.length).toBe(1)

      // 3. Update
      const updatedUser = await payload.update({
        collection: 'users',
        id: newUser.id,
        data: {
          name: 'Updated Temp Staff',
          role: 'follow_up_specialist',
          status: 'active',
        },
        overrideAccess: false,
        user: adminUser,
      })
      expect(updatedUser.name).toBe('Updated Temp Staff')
      expect(updatedUser.role).toBe('follow_up_specialist')

      // 4. Delete
      const deletedUser = await payload.delete({
        collection: 'users',
        id: newUser.id,
        overrideAccess: false,
        user: adminUser,
      })
      expect(deletedUser.id).toBe(newUser.id)
    })
  })

  // -------------------------------------------------------------------------
  // 10. Unauthenticated Access Protection
  // -------------------------------------------------------------------------
  describe('10. Unauthenticated Protection After Bootstrap', () => {
    it('rejects unauthenticated read/query', async () => {
      await expect(
        payload.find({
          collection: 'users',
          overrideAccess: false,
          user: undefined,
        }),
      ).rejects.toThrow()
    })

    it('rejects unauthenticated update', async () => {
      await expect(
        payload.update({
          collection: 'users',
          id: employeeUser.id,
          data: { name: 'Hacked Name' },
          overrideAccess: false,
          user: undefined,
        }),
      ).rejects.toThrow()
    })

    it('rejects unauthenticated delete', async () => {
      await expect(
        payload.delete({
          collection: 'users',
          id: employeeUser.id,
          overrideAccess: false,
          user: undefined,
        }),
      ).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // Regression & Edge Cases
  // -------------------------------------------------------------------------
  describe('11. Discovered Access Edge Cases & Isolation', () => {
    it('scoped read: non-admin can only query their own record and not others', async () => {
      const result = await payload.find({
        collection: 'users',
        overrideAccess: false,
        user: employeeUser,
      })

      // Must return exactly 1 document (own record) and NOT other staff/admin records
      expect(result.docs.length).toBe(1)
      expect(result.docs[0].id).toBe(employeeUser.id)
    })

    it('scoped read: inviter can only query their own record and not others', async () => {
      const result = await payload.find({
        collection: 'users',
        overrideAccess: false,
        user: inviterUser,
      })

      expect(result.docs.length).toBe(1)
      expect(result.docs[0].id).toBe(inviterUser.id)
    })

    it('non-admin cannot update other users even with non-role fields', async () => {
      await expect(
        payload.update({
          collection: 'users',
          id: adminUser.id,
          data: { name: 'Attempted Change' },
          overrideAccess: false,
          user: employeeUser,
        }),
      ).rejects.toThrow()
    })
  })
})
