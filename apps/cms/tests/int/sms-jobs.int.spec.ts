import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { beforeAll, it, expect } from 'vitest'
import { fixture } from '../helpers/v2'
import {
  getNextCeremonyInvite,
  submitInvitationOutcome,
} from '@/domain/invitations/invitationService'
import { MockSmsProvider, setSmsProvider } from '@/integrations/sms/mockProvider'
let payload: Payload
beforeAll(async () => {
  payload = await getPayload({ config })
})
it('persists outcome and durable job before provider delivery', async () => {
  const mock = new MockSmsProvider()
  setSmsProvider(mock)
  const f = await fixture(payload),
    input = { payload, user: f.inviter, ceremonyId: f.ceremony.id }
  const a = await getNextCeremonyInvite(input)
  const result = await submitInvitationOutcome({
    ...input,
    claimToken: a.claim!.token,
    sessionId: f.first.id,
    outcome: 'no_answer_sms',
  })
  expect(mock.sentMessages).toHaveLength(0)
  expect((await payload.findByID({ collection: 'invitations', id: result.id })).smsStatus).toBe(
    'queued',
  )
  await payload.jobs.run({ allQueues: true })
  expect((await payload.findByID({ collection: 'invitations', id: result.id })).smsStatus).toBe(
    'sent',
  )
  expect(mock.sentMessages.length).toBeGreaterThan(0)
})
it('provider failure does not revert the business outcome', async () => {
  const mock = new MockSmsProvider()
  mock.shouldFail = true
  setSmsProvider(mock)
  const f = await fixture(payload),
    input = { payload, user: f.inviter, ceremonyId: f.ceremony.id }
  const a = await getNextCeremonyInvite(input)
  const result = await submitInvitationOutcome({
    ...input,
    claimToken: a.claim!.token,
    sessionId: f.first.id,
    outcome: 'no_answer_sms',
  })
  await payload.jobs.run({ allQueues: true })
  const invitation = await payload.findByID({ collection: 'invitations', id: result.id })
  expect(invitation.outcome).toBe('no_answer_sms')
  expect(invitation.smsStatus).toBe('failed')
})
