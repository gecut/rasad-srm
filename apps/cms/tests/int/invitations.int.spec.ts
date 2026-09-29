import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, describe, it, expect } from 'vitest'
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
  it('no_answer outcome suppresses student until next session advancement then prioritizes without SMS', async () => {
    const f = await fixture(payload),
      input = { payload, user: f.inviter, ceremonyId: f.ceremony.id }
    const a = await getNextCeremonyInvite(input)
    const result = await submitInvitationOutcome({
      ...input,
      claimToken: a.claim!.token,
      sessionId: f.first.id,
      outcome: 'no_answer',
    })
    expect(result.outcome).toBe('no_answer')
    expect(result.assignedSession).toBeNull()

    const invitation = await payload.findByID({ collection: 'invitations', id: result.id })
    expect(invitation.smsStatus).toBe('not_required')

    // Suppressed while f.first is filling
    expect((await getNextCeremonyInvite(input)).claim?.student.id).not.toBe(a.claim!.student.id)

    // Advance session to f.second
    await advanceCeremonySession({
      payload,
      user: f.admin,
      ceremonyId: f.ceremony.id,
      expectedSessionId: f.first.id,
    })

    // Now re-eligible and prioritized for the new session
    expect((await getNextCeremonyInvite(input)).claim?.student.id).toBe(a.claim!.student.id)
  })
  it('allows caller to select an alternative open session directly and queues SMS on accepted', async () => {
    const f = await fixture(payload),
      input = { payload, user: f.inviter, ceremonyId: f.ceremony.id }
    const a = await getNextCeremonyInvite(input)
    // Inviter chooses f.second directly instead of current filling f.first
    const result = await submitInvitationOutcome({
      ...input,
      claimToken: a.claim!.token,
      sessionId: f.second.id,
      outcome: 'accepted',
    })
    expect(result.outcome).toBe('accepted')
    expect(result.assignedSession).toBe(f.second.id)

    const invitation = await payload.findByID({ collection: 'invitations', id: result.id })
    expect(invitation.smsStatus).toBe('queued')
  })
})
