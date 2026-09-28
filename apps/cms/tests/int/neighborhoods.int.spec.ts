import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

describe('Neighborhoods Domain & Collection', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('creates and retrieves a neighborhood with unique name and subDistricts list', async () => {
    // Delete any previous test neighborhood with this name
    await payload.delete({
      collection: 'neighborhoods',
      where: { name: { in: ['وکیل آباد', 'تست سجاد'] } },
      overrideAccess: true,
    })

    const created = await payload.create({
      collection: 'neighborhoods',
      data: {
        name: 'وکیل آباد',
        description: 'محدوده وکیل آباد مشهد',
        subDistricts: [{ name: 'هفت تیر' }, { name: 'حافظ' }, { name: 'صدف' }],
      },
      overrideAccess: true,
    })

    expect(created.id).toBeDefined()
    expect(created.name).toBe('وکیل آباد')
    expect(created.subDistricts).toHaveLength(3)
    expect(created.subDistricts?.[0]?.name).toBe('هفت تیر')

    // Verifies name uniqueness invariant
    await expect(
      payload.create({
        collection: 'neighborhoods',
        data: { name: 'وکیل آباد' },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })
})
