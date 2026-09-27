import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, it, expect } from 'vitest'
import { fixture } from '../helpers/v2'
import { advanceCeremonySession } from '@/domain/ceremonies/sessionService'
let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
})
describe('Sequential ceremony sessions', () => {
  it('advances explicitly and seals previous, then ends with no destination', async () => {
    const f = await fixture(payload)
    const next = await advanceCeremonySession({
      payload,
      user: f.admin,
      ceremonyId: f.ceremony.id,
      expectedSessionId: f.first.id,
    })
    expect(next.session?.id).toBe(f.second.id)
    expect((await payload.findByID({ collection: 'sessions', id: f.first.id })).status).toBe(
      'sealed',
    )
    expect(
      (
        await advanceCeremonySession({
          payload,
          user: f.admin,
          ceremonyId: f.ceremony.id,
          expectedSessionId: f.second.id,
        })
      ).session,
    ).toBeNull()
  })
  it('rejects concurrent duplicate advancement with same expected session', async () => {
    const f = await fixture(payload)
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        advanceCeremonySession({
          payload,
          user: f.admin,
          ceremonyId: f.ceremony.id,
          expectedSessionId: f.first.id,
        }),
      ),
    )
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(
      (
        await payload.count({
          collection: 'sessions',
          where: {
            and: [{ ceremony: { equals: f.ceremony.id } }, { status: { equals: 'filling' } }],
          },
        })
      ).totalDocs,
    ).toBe(1)
  })
  it('denies inviter advancement and direct creation of filling session', async () => {
    const f = await fixture(payload)
    await expect(
      advanceCeremonySession({
        payload,
        user: f.inviter,
        ceremonyId: f.ceremony.id,
        expectedSessionId: f.first.id,
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'sessions',
        data: { ceremony: f.ceremony.id, startsAt: '2030-03-23T12:00:00Z', status: 'filling' },
      }),
    ).rejects.toThrow()
  })
  it('validates schedule on partial update', async () => {
    const f = await fixture(payload)
    await expect(
      payload.update({
        collection: 'sessions',
        id: f.second.id,
        data: { endsAt: '2029-01-01T00:00:00Z' },
      }),
    ).rejects.toThrow()
  })
})
