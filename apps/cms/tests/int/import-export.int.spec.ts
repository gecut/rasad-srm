import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import type { User } from '@/payload-types'
import { describe, it, beforeAll, expect } from 'vitest'
import { normalizeStudentRow } from '../../src/integrations/importExport'

let payload: Payload

describe('Data Import/Export Plugin Integration', () => {
  let adminUser: User
  let employeeUser: User
  let inviterUser: User

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Clean test tables
    await payload.delete({ collection: 'users', where: { email: { contains: 'import-export-test' } } })

    // Seed test users
    adminUser = await payload.create({
      collection: 'users',
      data: {
        email: 'import-export-test-admin@example.com',
        name: 'IE Admin',
        password: 'Password123!',
        role: 'admin',
        status: 'active',
      },
      overrideAccess: true,
    })

    employeeUser = await payload.create({
      collection: 'users',
      data: {
        email: 'import-export-test-employee@example.com',
        name: 'IE Employee',
        password: 'Password123!',
        role: 'employee',
        status: 'active',
      },
      overrideAccess: true,
    })

    inviterUser = await payload.create({
      collection: 'users',
      data: {
        email: 'import-export-test-inviter@example.com',
        name: 'IE Inviter',
        password: 'Password123!',
        role: 'inviter',
        status: 'active',
        username: '09129998877',
      },
      overrideAccess: true,
    })
  })

  describe('1. normalizeStudentRow hook logic', () => {
    it('sets origin to import automatically', () => {
      const row = normalizeStudentRow({ firstName: 'رضا', lastName: 'احمدی' })
      expect(row.origin).toBe('import')
    })

    it('normalizes Arabic characters (ي/ك) and trims spaces', () => {
      const row = normalizeStudentRow({
        firstName: '  علي  ',
        lastName: '  كمال ي  ',
      })
      expect(row.firstName).toBe('علی')
      expect(row.lastName).toBe('کمال ی')
    })

    it('normalizes Persian digits in mobile phone numbers', () => {
      const row = normalizeStudentRow({
        firstName: 'علی',
        lastName: 'کمالی',
        mobile: '۰۹۱۲۳۴۵۶۷۸۹',
        motherMobile: '+989121112233',
      })
      expect(row.mobile).toBe('09123456789')
      expect(row.motherMobile).toBe('09121112233')
    })

    it('converts Jalali date strings into ISO Gregorian timestamps', () => {
      const row = normalizeStudentRow({
        firstName: 'علی',
        lastName: 'کمالی',
        referredAt: '1403/07/01',
      })
      expect(typeof row.referredAt).toBe('string')
      expect(row.referredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('normalizes landline, address, referrer, and notes', () => {
      const row = normalizeStudentRow({
        firstName: 'امیررضا',
        lastName: 'آتشکار  ',
        landline: ' ۳۵۰۹۰۴۱۴ ',
        address: 'لادن23 پ20  ',
        referrer: 'خانوم مشایخی ',
        notes: 'خواهان کلاس ',
      })
      expect(row.lastName).toBe('آتشکار')
      expect(row.landline).toBe('35090414')
      expect(row.address).toBe('لادن23 پ20')
      expect(row.referrer).toBe('خانوم مشایخی')
      expect(row.notes).toBe('خواهان کلاس')
      expect(row.origin).toBe('import')
    })
  })

  describe('2. Collection-level Access Control', () => {
    it('allows Admin to access exports collection', async () => {
      const result = await payload.find({
        collection: 'exports',
        user: adminUser,
        overrideAccess: false,
      })
      expect(result).toBeDefined()
      expect(result.docs).toBeInstanceOf(Array)
    })

    it('allows Employee to access exports collection', async () => {
      const result = await payload.find({
        collection: 'exports',
        user: employeeUser,
        overrideAccess: false,
      })
      expect(result).toBeDefined()
      expect(result.docs).toBeInstanceOf(Array)
    })

    it('forbids Inviter from reading exports collection', async () => {
      await expect(
        payload.find({
          collection: 'exports',
          user: inviterUser,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })

    it('allows Admin to access imports collection', async () => {
      const result = await payload.find({
        collection: 'imports',
        user: adminUser,
        overrideAccess: false,
      })
      expect(result).toBeDefined()
      expect(result.docs).toBeInstanceOf(Array)
    })

    it('forbids Employee from creating imports in imports collection', async () => {
      await expect(
        payload.create({
          collection: 'imports',
          user: employeeUser,
          overrideAccess: false,
          data: {
            collectionSlug: 'students',
          },
        }),
      ).rejects.toThrow()
    })

    it('forbids Inviter from creating imports in imports collection', async () => {
      await expect(
        payload.create({
          collection: 'imports',
          user: inviterUser,
          overrideAccess: false,
          data: {
            collectionSlug: 'students',
          },
        }),
      ).rejects.toThrow()
    })
  })

  describe('3. Plugin Registration & Configuration Guardrails', () => {
    it('registers exports and imports collections in Payload', () => {
      const exportCol = payload.config.collections.find((c) => c.slug === 'exports')
      const importCol = payload.config.collections.find((c) => c.slug === 'imports')

      expect(exportCol).toBeDefined()
      expect(importCol).toBeDefined()
      expect(exportCol?.admin?.group).toBe('مدیریت داده')
      expect(importCol?.admin?.group).toBe('مدیریت داده')
    })

    it('registers createCollectionExport and createCollectionImport background tasks', () => {
      const taskSlugs = payload.config.jobs?.tasks?.map((t) => t.slug) ?? []
      expect(taskSlugs).toContain('createCollectionExport')
      expect(taskSlugs).toContain('createCollectionImport')
    })
  })

  describe('4. Student Creation with Import Row Normalization', () => {
    it('creates a student record with normalized attributes and origin: import', async () => {
      const normalized = normalizeStudentRow({
        firstName: '  محمّدرضا  ',
        lastName: '  حسيني  ',
        mobile: '۰۹۳۵۱۱۱۲۲۳۳',
        grade: 4,
      })

      const student = await payload.create({
        collection: 'students',
        user: adminUser,
        overrideAccess: false,
        data: normalized as any,
      })

      expect(student.id).toBeDefined()
      expect(student.origin).toBe('import')
      expect(student.firstName).toBe('محمّدرضا')
      expect(student.lastName).toBe('حسینی')
      expect(student.mobile).toBe('09351112233')
      expect(student.grade).toBe(4)
    })
  })
})
