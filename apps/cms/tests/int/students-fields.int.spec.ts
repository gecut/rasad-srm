import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('Students Extended Fields & Reverse Joins', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('persists neighborhood relation, landline, address, referrer, and notes', async () => {
    // 1. Clean previous test neighborhood if exists
    await payload.delete({
      collection: 'neighborhoods',
      where: { name: { equals: 'احمدآباد - تست فیلدها' } },
      overrideAccess: true,
    })

    // Create a neighborhood
    const neighborhood = await payload.create({
      collection: 'neighborhoods',
      data: {
        name: 'احمدآباد - تست فیلدها',
        subDistricts: [{ name: 'ملاصدرا' }, { name: 'رضا' }],
      },
      overrideAccess: true,
    })

    // 2. Create student with new fields
    const student = await payload.create({
      collection: 'students',
      data: {
        firstName: 'علی',
        lastName: 'رضایی  ',
        neighborhood: neighborhood.id,
        landline: '05138450000',
        address: 'خیابان ملاصدرا، پلاک ۱۰  ',
        referrer: 'مدرسه شهید هاشمی‌نژاد',
        notes: 'علاقه‌مند به جلسات عصر',
        lifecycleStatus: 'unknown',
        readinessStatus: 'normal',
        origin: 'admin',
      },
      overrideAccess: true,
    })

    expect(student.id).toBeDefined()
    expect(student.lastName).toBe('رضایی')
    expect(student.landline).toBe('05138450000')
    expect(student.address).toBe('خیابان ملاصدرا، پلاک ۱۰')
    expect(student.referrer).toBe('مدرسه شهید هاشمی‌نژاد')
    expect(student.notes).toBe('علاقه‌مند به جلسات عصر')

    // 3. Verify neighborhood relationship can be populated
    const fetched = await payload.findByID({
      collection: 'students',
      id: student.id,
      depth: 1,
      overrideAccess: true,
    })

    expect(fetched.neighborhood).toBeDefined()
    expect(typeof fetched.neighborhood === 'object').toBe(true)
    if (typeof fetched.neighborhood === 'object' && fetched.neighborhood !== null) {
      expect(fetched.neighborhood.name).toBe('احمدآباد - تست فیلدها')
    }
  })
})
