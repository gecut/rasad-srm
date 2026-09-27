import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('fetches users with privileged system access (overrideAccess: true)', async () => {
    const users = await payload.find({
      collection: 'users',
      overrideAccess: true,
    })
    expect(users).toBeDefined()
  })

  it('rejects unauthenticated user fetch when access control is enforced (overrideAccess: false)', async () => {
    await expect(
      payload.find({
        collection: 'users',
        overrideAccess: false,
        user: undefined,
      }),
    ).rejects.toThrow()
  })
})
