import { randomUUID } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { InvitationQueue, InvitationOutcome, StudentCard } from '@rasad/contracts'
import type { User, Student, Invitation } from '@/payload-types'
import { authorize, DomainError, relationID, transaction, lockTransaction } from '../shared/core'
import { fillingSession } from '../ceremonies/sessionService'

const roles: User['role'][] = ['inviter', 'admin', 'employee']
const leaseMs = 5 * 60 * 1000
const card = (student: Student): StudentCard => ({
  id: student.id,
  firstName: student.firstName,
  lastName: student.lastName,
  grade: student.grade,
  mobile: student.mobile,
  motherMobile: student.motherMobile,
  fatherMobile: student.fatherMobile,
})
const callable = (s: Student) =>
  s.lifecycleStatus !== 'removed' &&
  [s.mobile, s.motherMobile, s.fatherMobile].some((v) => v && /^09\d{9}$/.test(v))
type Input = {
  payload: Payload
  user: User | null | undefined
  ceremonyId: number
  req?: PayloadRequest
}

export async function getNextCeremonyInvite(input: Input): Promise<InvitationQueue> {
  const { payload, ceremonyId } = input
  const actor = await authorize(payload, input.user, roles, input.req)
  return transaction(
    payload,
    actor,
    `ceremony:${ceremonyId}`,
    async (req) => {
      await authorize(payload, actor, roles, req)
      const session = await fillingSession(payload, ceremonyId, req)
      if (!session) return { session: null, claim: null }
      const now = new Date().toISOString()
      await payload.delete({
        collection: 'invitation-claims',
        where: {
          and: [
            { ceremony: { equals: ceremonyId } },
            {
              or: [
                { expiresAt: { less_than_equal: now } },
                { session: { not_equals: session.id } },
              ],
            },
          ],
        },
        req,
      })
      const own = await payload.find({
        collection: 'invitation-claims',
        where: { and: [{ ceremony: { equals: ceremonyId } }, { inviter: { equals: actor.id } }] },
        limit: 1,
        depth: 0,
        req,
      })
      if (own.docs[0]) {
        const claim = own.docs[0]
        const student = await payload.findByID({
          collection: 'students',
          id: relationID(claim.student),
          depth: 0,
          req,
        })
        if (callable(student))
          return {
            session,
            claim: {
              token: claim.token,
              student: card(student),
              session,
              expiresAt: claim.expiresAt,
            },
          }
        await payload.delete({ collection: 'invitation-claims', id: claim.id, req })
      }
      // Select in PostgreSQL instead of materializing the entire ceremony history.
      const tx = await req.transactionID
      if (!tx) throw new Error('Transaction required')
      const db = (payload.db as unknown as PostgresAdapter).sessions[tx].db
      const candidates = await db.execute(sql`
        SELECT s.id FROM students s
        LEFT JOIN invitations i ON i.student_id=s.id AND i.ceremony_id=${ceremonyId}
        WHERE s.lifecycle_status <> 'removed'
          AND (s.mobile ~ '^09[0-9]{9}$' OR s.mother_mobile ~ '^09[0-9]{9}$' OR s.father_mobile ~ '^09[0-9]{9}$')
          AND NOT EXISTS (SELECT 1 FROM invitation_claims c WHERE c.student_id=s.id AND c.ceremony_id=${ceremonyId})
          AND (i.id IS NULL OR (i.outcome='needs_alternative_session' AND i.processed_session_id<>${session.id} AND i.processed_at<${session.fillingStartedAt}::timestamptz))
        ORDER BY CASE WHEN i.outcome='needs_alternative_session' THEN 0 ELSE 1 END, s.created_at,s.id
        LIMIT 1
      `)
      const candidateID = candidates.rows[0]?.id
      const student =
        typeof candidateID === 'number'
          ? await payload.findByID({ collection: 'students', id: candidateID, depth: 0, req })
          : null
      if (!student) return { session, claim: null }
      const claim = await payload.create({
        collection: 'invitation-claims',
        data: {
          ceremony: ceremonyId,
          session: session.id,
          student: student.id,
          inviter: actor.id,
          token: randomUUID(),
          expiresAt: new Date(Date.now() + leaseMs).toISOString(),
        },
        req,
      })
      return {
        session,
        claim: { token: claim.token, student: card(student), session, expiresAt: claim.expiresAt },
      }
    },
    input.req,
  )
}

export async function submitInvitationOutcome(
  input: Input & {
    claimToken: string
    sessionId: number
    outcome: InvitationOutcome
    note?: string
  },
) {
  const { payload, ceremonyId, outcome } = input
  const actor = await authorize(payload, input.user, roles, input.req)
  if (!['accepted', 'needs_alternative_session', 'no_answer_sms', 'failed'].includes(outcome))
    throw new DomainError('نتیجه دعوت معتبر نیست.')
  return transaction(
    payload,
    actor,
    `ceremony:${ceremonyId}`,
    async (req) => {
      await authorize(payload, actor, roles, req)
      const session = await fillingSession(payload, ceremonyId, req)
      if (!session || session.id !== input.sessionId)
        throw new DomainError(
          'سانس تغییر کرده است؛ اطلاعات تماس را بازخوانی و دوباره تأیید کنید.',
          409,
        )
      const claims = await payload.find({
        collection: 'invitation-claims',
        where: {
          and: [
            { token: { equals: input.claimToken } },
            { ceremony: { equals: ceremonyId } },
            { inviter: { equals: actor.id } },
            { session: { equals: session.id } },
            { expiresAt: { greater_than: new Date().toISOString() } },
          ],
        },
        limit: 1,
        depth: 0,
        req,
      })
      const claim = claims.docs[0]
      if (!claim)
        throw new DomainError(
          'مهلت تماس تمام شده یا این تماس به شما واگذار نشده است؛ کارت را بازخوانی کنید.',
          409,
        )
      await lockTransaction(payload, req, `student:${relationID(claim.student)}`)
      const student = await payload.findByID({
        collection: 'students',
        id: relationID(claim.student),
        depth: 0,
        req,
      })
      if (!callable(student)) throw new DomainError('دانش‌آموز دیگر واجد شرایط دعوت نیست.', 409)
      const previous = (
        await payload.find({
          collection: 'invitations',
          where: {
            and: [{ student: { equals: student.id } }, { ceremony: { equals: ceremonyId } }],
          },
          limit: 1,
          depth: 0,
          req,
        })
      ).docs[0]
      if (previous && previous.outcome !== 'needs_alternative_session')
        throw new DomainError('نتیجه این دعوت قبلاً ثبت شده است.', 409)
      const processedAt = new Date().toISOString()
      const attempt = {
        outcome,
        inviter: actor.id,
        processedAt,
        session: session.id,
        note: input.note || '',
      }
      const data = {
        student: student.id,
        ceremony: ceremonyId,
        processedSession: session.id,
        assignedSession: outcome === 'accepted' ? session.id : null,
        inviter: actor.id,
        outcome,
        note: input.note,
        processedAt,
        smsStatus: outcome === 'no_answer_sms' ? ('queued' as const) : ('not_required' as const),
        attempts: [...(Array.isArray(previous?.attempts) ? previous.attempts : []), attempt],
      }
      const invitation: Invitation = previous
        ? await payload.update({ collection: 'invitations', id: previous.id, data, req })
        : await payload.create({ collection: 'invitations', data, req })
      // Durable job is committed with the result; provider execution happens after commit.
      if (outcome === 'no_answer_sms')
        await payload.jobs.queue({ task: 'send-sms', input: { invitationId: invitation.id }, req })
      await payload.delete({ collection: 'invitation-claims', id: claim.id, req })
      return {
        id: invitation.id,
        outcome: invitation.outcome,
        assignedSession: invitation.assignedSession ? relationID(invitation.assignedSession) : null,
      }
    },
    input.req,
  )
}
