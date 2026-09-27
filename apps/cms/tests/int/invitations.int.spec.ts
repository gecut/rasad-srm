import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, it, expect } from 'vitest'
import { fixture } from '../helpers/v2'
import {
  getNextCeremonyInvite,
  submitInvitationOutcome,
} from '@/domain/invitations/invitationService'
import { advanceCeremonySession } from '@/domain/ceremonies/sessionService'
let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
})
describe('Ceremony invitations', () => {
  it('claims deterministically and accepts current session without changing lifecycle', async () => {
    const f = await fixture(payload),
      input = { payload, user: f.inviter, ceremonyId: f.ceremony.id }
    const a = await getNextCeremonyInvite(input),
      b = await getNextCeremonyInvite(input)
    expect(a.claim?.token).toBe(b.claim?.token)
    const before = await payload.findByID({ collection: 'students', id: a.claim!.student.id })
    const result = await submitInvitationOutcome({
      ...input,
      claimToken: a.claim!.token,
      sessionId: f.first.id,
      outcome: 'accepted',
    })
    expect(result.assignedSession).toBe(f.first.id)
    expect(
      (await payload.findByID({ collection: 'students', id: before.id })).lifecycleStatus,
    ).toBe(before.lifecycleStatus)
    await expect(
      submitInvitationOutcome({
        ...input,
        claimToken: a.claim!.token,
        sessionId: f.first.id,
        outcome: 'accepted',
      }),
    ).rejects.toThrow()
  })
  it('alternative outcome is suppressed until advancement then prioritized', async () => {
    const f = await fixture(payload),
      input = { payload, user: f.inviter, ceremonyId: f.ceremony.id }
    const a = await getNextCeremonyInvite(input)
    await submitInvitationOutcome({
      ...input,
      claimToken: a.claim!.token,
      sessionId: f.first.id,
      outcome: 'needs_alternative_session',
    })
    expect((await getNextCeremonyInvite(input)).claim?.student.id).not.toBe(a.claim!.student.id)
    await advanceCeremonySession({
      payload,
      user: f.admin,
      ceremonyId: f.ceremony.id,
      expectedSessionId: f.first.id,
    })
    expect((await getNextCeremonyInvite(input)).claim?.student.id).toBe(a.claim!.student.id)
  })
  it('rejects old session and invalid claim owner, and restricts collection CRUD', async () => {
    const f = await fixture(payload),
      input = { payload, user: f.inviter, ceremonyId: f.ceremony.id }
    const a = await getNextCeremonyInvite(input)
    await expect(
      submitInvitationOutcome({
        ...input,
        user: f.admin,
        claimToken: a.claim!.token,
        sessionId: f.first.id,
        outcome: 'accepted',
      }),
    ).rejects.toThrow()
    await advanceCeremonySession({
      payload,
      user: f.admin,
      ceremonyId: f.ceremony.id,
      expectedSessionId: f.first.id,
    })
    await expect(
      submitInvitationOutcome({
        ...input,
        claimToken: a.claim!.token,
        sessionId: f.first.id,
        outcome: 'accepted',
      }),
    ).rejects.toThrow()
    await expect(
      payload.find({ collection: 'students', user: f.inviter, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.find({ collection: 'invitations', user: f.inviter, overrideAccess: false }),
    ).rejects.toThrow()
  })
  it('rejects expired claims', async () => {
    const f = await fixture(payload),
      input = { payload, user: f.inviter, ceremonyId: f.ceremony.id }
    const a = await getNextCeremonyInvite(input)
    await payload.update({
      collection: 'invitation-claims',
      where: { token: { equals: a.claim!.token } },
      data: { expiresAt: '2000-01-01T00:00:00Z' },
    })
    await expect(
      submitInvitationOutcome({
        ...input,
        claimToken: a.claim!.token,
        sessionId: f.first.id,
        outcome: 'failed',
      }),
    ).rejects.toThrow()
  })
})
