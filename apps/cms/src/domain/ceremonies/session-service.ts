import type { Payload, PayloadRequest } from 'payload'
import type { User, Session } from '@/payload-types'
import { authorize, DomainError, transaction } from '../shared/core'

export async function fillingSession(
  payload: Payload,
  ceremonyId: number,
  req: PayloadRequest,
): Promise<Session | null> {
  const ceremony = await payload.findByID({
    collection: 'ceremonies',
    id: ceremonyId,
    req,
    depth: 0,
  })
  if (!['inviting', 'active', 'scheduled'].includes(ceremony.status))
    throw new DomainError('دعوت برای این مراسم فعال نیست.', 409)
  const result = await payload.find({
    collection: 'sessions',
    where: { and: [{ ceremony: { equals: ceremonyId } }, { status: { equals: 'filling' } }] },
    limit: 2,
    depth: 0,
    req,
  })
  if (result.docs.length > 1) throw new Error('Multiple filling sessions violate invariant')
  return result.docs[0] || null
}

export async function advanceCeremonySession({
  payload,
  user,
  ceremonyId,
  expectedSessionId,
  req: parent,
}: {
  payload: Payload
  user: User | null | undefined
  ceremonyId: number
  expectedSessionId: number | null
  req?: PayloadRequest
}) {
  const actor = await authorize(payload, user, ['admin', 'employee'], parent)
  return transaction(
    payload,
    actor,
    `ceremony:${ceremonyId}`,
    async (req) => {
      await authorize(payload, actor, ['admin', 'employee'], req)
      const current = await fillingSession(payload, ceremonyId, req)
      if ((current?.id ?? null) !== expectedSessionId)
        throw new DomainError('سانس تغییر کرده است؛ صفحه را تازه کنید.', 409)
      const next = await payload.find({
        collection: 'sessions',
        where: { and: [{ ceremony: { equals: ceremonyId } }, { status: { equals: 'queued' } }] },
        sort: ['startsAt', 'id'],
        limit: 1,
        depth: 0,
        req,
      })
      if (current)
        await payload.update({
          collection: 'sessions',
          id: current.id,
          data: { status: 'sealed' },
          req,
        })
      const session = next.docs[0]
        ? await payload.update({
            collection: 'sessions',
            id: next.docs[0].id,
            data: { status: 'filling' },
            req,
          })
        : null
      // In-flight claims are intentionally preserved with their remaining lease time
      // so active callers speaking with families do not lose their current card.
      return { session }
    },
    parent,
  )
}

export async function reopenCeremonySession({
  payload,
  user,
  ceremonyId,
  sessionId,
  req: parent,
}: {
  payload: Payload
  user: User | null | undefined
  ceremonyId: number
  sessionId: number
  req?: PayloadRequest
}) {
  const actor = await authorize(payload, user, ['admin', 'employee'], parent)
  return transaction(
    payload,
    actor,
    `ceremony:${ceremonyId}`,
    async (req) => {
      await authorize(payload, actor, ['admin', 'employee'], req)
      const currentFilling = await fillingSession(payload, ceremonyId, req)
      if (currentFilling) {
        await payload.update({
          collection: 'sessions',
          id: currentFilling.id,
          data: { status: 'queued' },
          req,
        })
      }
      const reopened = await payload.update({
        collection: 'sessions',
        id: sessionId,
        data: { status: 'filling' },
        req,
      })
      return { session: reopened }
    },
    parent,
  )
}

export async function getSessionTelemetry(
  payload: Payload,
  sessionId: number,
  req?: PayloadRequest,
) {
  const [accepted, checkins] = await Promise.all([
    payload.count({
      collection: 'invitations',
      where: {
        and: [{ assignedSession: { equals: sessionId } }, { outcome: { equals: 'accepted' } }],
      },
      req,
    }),
    payload.count({
      collection: 'session-checkins',
      where: { session: { equals: sessionId } },
      req,
    }),
  ])
  return {
    acceptedCount: accepted.totalDocs,
    checkedInCount: checkins.totalDocs,
  }
}
