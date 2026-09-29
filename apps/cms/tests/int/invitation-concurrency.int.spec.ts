import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, it, expect } from 'vitest'
import { fixture } from '../helpers/v2'
import {
  getNextCeremonyInvite,
  submitInvitationOutcome,
} from '@/domain/invitations/invitation-service'
import { advanceCeremonySession } from '@/domain/ceremonies/session-service'
let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
})
it('parallel inviters cannot obtain the same student', async () => {
  const f = await fixture(payload)
  const results = await Promise.all(
    [f.inviter, f.admin].map((user) =>
      getNextCeremonyInvite({ payload, user, ceremonyId: f.ceremony.id }),
    ),
  )
  const ids = results.flatMap((r) => (r.claim ? [r.claim.student.id] : []))
  expect(new Set(ids).size).toBe(ids.length)
})
it('parallel submissions persist exactly one result', async () => {
  const f = await fixture(payload),
    input = { payload, user: f.inviter, ceremonyId: f.ceremony.id }
  const a = await getNextCeremonyInvite(input)
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      submitInvitationOutcome({
        ...input,
        claimToken: a.claim!.token,
        sessionId: f.first.id,
        outcome: 'accepted',
      }),
    ),
  )
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  expect(
    (
      await payload.count({
        collection: 'invitations',
        where: {
          and: [
            { ceremony: { equals: f.ceremony.id } },
            { student: { equals: a.claim!.student.id } },
          ],
        },
      })
    ).totalDocs,
  ).toBe(1)
})
it('accept versus advance is serialized, never assigns the new session silently', async () => {
  const f = await fixture(payload),
    input = { payload, user: f.inviter, ceremonyId: f.ceremony.id }
  const a = await getNextCeremonyInvite(input)
  const [result] = await Promise.allSettled([
    submitInvitationOutcome({
      ...input,
      claimToken: a.claim!.token,
      sessionId: f.first.id,
      outcome: 'accepted',
    }),
    advanceCeremonySession({
      payload,
      user: f.admin,
      ceremonyId: f.ceremony.id,
      expectedSessionId: f.first.id,
    }),
  ])
  if (result.status === 'fulfilled') expect(result.value.assignedSession).toBe(f.first.id)
  else expect(result.reason.status).toBe(409)
})
