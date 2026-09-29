import { randomUUID } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type {
  InvitationQueue,
  InvitationOutcome,
  StudentCard,
  SessionSummary,
  StudentCheckinSummary,
} from '@rasad/contracts'
import type { User, Student, Invitation, Session } from '@/payload-types'
import { authorize, DomainError, relationID, transaction } from '../shared/core'
import { fillingSession, getSessionTelemetry } from '../ceremonies/session-service'

const roles: User['role'][] = ['inviter', 'admin', 'employee']
const leaseMs = 5 * 60 * 1000

const callable = (s: Student) =>
  s.lifecycleStatus !== 'removed' &&
  [s.mobile, s.motherMobile, s.fatherMobile].some((v) => v && /^09\d{9}$/.test(v))

async function buildStudentCard(
  payload: Payload,
  student: Student,
  req: PayloadRequest,
): Promise<StudentCard> {
  const checkins = await payload.find({
    collection: 'session-checkins',
    where: { student: { equals: student.id } },
    sort: '-checkedInAt',
    limit: 2,
    depth: 1,
    req,
  })

  const recentCheckins: StudentCheckinSummary[] = checkins.docs.map((c) => {
    const sessionObj = typeof c.session === 'object' && c.session !== null ? c.session : null
    const ceremonyObj =
      sessionObj && typeof sessionObj.ceremony === 'object' && sessionObj.ceremony !== null
        ? sessionObj.ceremony
        : null
    return {
      ceremonyId: ceremonyObj ? ceremonyObj.id : (sessionObj?.ceremony as number) || 0,
      ceremonyTitle: ceremonyObj?.title || 'مراسم',
      sessionId: relationID(c.session),
      sessionTitle: sessionObj?.title || 'سانس',
      checkedInAt: c.checkedInAt,
    }
  })

  let neighborhoodData: { id: number; name: string } | null = null
  if (student.neighborhood) {
    if (typeof student.neighborhood === 'object' && 'name' in student.neighborhood) {
      neighborhoodData = { id: student.neighborhood.id, name: student.neighborhood.name }
    } else {
      const n = await payload.findByID({
        collection: 'neighborhoods',
        id: relationID(student.neighborhood),
        depth: 0,
        req,
      })
      if (n) neighborhoodData = { id: n.id, name: n.name }
    }
  }

  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    grade: student.grade,
    mobile: student.mobile,
    motherMobile: student.motherMobile,
    fatherMobile: student.fatherMobile,
    landline: student.landline,
    neighborhood: neighborhoodData,
    referrer: student.referrer,
    notes: student.notes,
    recentCheckins,
  }
}

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
    `inviter:${actor.id}`,
    async (req) => {
      await authorize(payload, actor, roles, req)
      const session = await fillingSession(payload, ceremonyId, req)

      // Retrieve all active/available sessions for the ceremony with telemetry
      const allSessionsResult = await payload.find({
        collection: 'sessions',
        where: {
          and: [
            { ceremony: { equals: ceremonyId } },
            { status: { in: ['filling', 'queued', 'sealed', 'active'] } },
          ],
        },
        sort: ['startsAt', 'id'],
        depth: 0,
        req,
      })

      const availableSessions: SessionSummary[] = await Promise.all(
        allSessionsResult.docs.map(async (s: Session) => {
          const stats = await getSessionTelemetry(payload, s.id, req)
          return {
            id: s.id,
            title: s.title,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
            status: s.status,
            capacity: s.capacity,
            acceptedCount: stats.acceptedCount,
            checkedInCount: stats.checkedInCount,
          }
        }),
      )

      if (!session) {
        return { session: null, availableSessions, claim: null }
      }

      const activeSessionSummary: SessionSummary = availableSessions.find(
        (s) => s.id === session.id,
      ) || {
        id: session.id,
        title: session.title,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        capacity: session.capacity,
      }

      const now = new Date().toISOString()

      // Delete expired claims and claims from older sessions for this ceremony
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

      // Check if current inviter already holds an active claim in this ceremony
      const own = await payload.find({
        collection: 'invitation-claims',
        where: {
          and: [
            { ceremony: { equals: ceremonyId } },
            { inviter: { equals: actor.id } },
            { expiresAt: { greater_than: now } },
          ],
        },
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
        if (callable(student)) {
          const studentCard = await buildStudentCard(payload, student, req)
          const claimSession =
            availableSessions.find((s) => s.id === relationID(claim.session)) ||
            activeSessionSummary
          return {
            session: activeSessionSummary,
            availableSessions,
            claim: {
              token: claim.token,
              student: studentCard,
              session: claimSession,
              expiresAt: claim.expiresAt,
            },
          }
        }
        await payload.delete({ collection: 'invitation-claims', id: claim.id, req })
      }

      // Lock-Free Candidate selection using PostgreSQL FOR UPDATE OF s SKIP LOCKED
      const tx = await req.transactionID
      if (!tx) throw new Error('Transaction required')
      const db = (payload.db as unknown as PostgresAdapter).sessions[tx].db

      const fillingStartedAtParam = session.fillingStartedAt
        ? session.fillingStartedAt
        : session.createdAt

      const candidates = await db.execute(sql`
        SELECT s.id FROM students s
        LEFT JOIN invitations i ON i.student_id = s.id AND i.ceremony_id = ${ceremonyId}
        WHERE s.lifecycle_status <> 'removed'
          AND (s.mobile ~ '^09[0-9]{9}$' OR s.mother_mobile ~ '^09[0-9]{9}$' OR s.father_mobile ~ '^09[0-9]{9}$')
          AND NOT EXISTS (
            SELECT 1 FROM invitation_claims c
            WHERE c.student_id = s.id
              AND c.ceremony_id = ${ceremonyId}
              AND c.expires_at > ${now}
          )
          AND (
            i.id IS NULL
            OR (
              i.outcome IN ('needs_alternative_session', 'no_answer')
              AND i.processed_session_id <> ${session.id}
              AND i.processed_at < ${fillingStartedAtParam}::timestamptz
            )
            OR (
              i.outcome = 'postponed'
              AND i.postponed_until IS NOT NULL
              AND i.postponed_until <= ${now}::timestamptz
            )
          )
        ORDER BY
          CASE
            WHEN i.outcome = 'postponed' THEN 0
            WHEN i.outcome IN ('needs_alternative_session', 'no_answer') THEN 1
            ELSE 2
          END,
          s.created_at,
          s.id
        FOR UPDATE OF s SKIP LOCKED
        LIMIT 1
      `)

      const candidateID = candidates.rows[0]?.id
      const student =
        typeof candidateID === 'number'
          ? await payload.findByID({ collection: 'students', id: candidateID, depth: 0, req })
          : null

      if (!student) {
        return { session: activeSessionSummary, availableSessions, claim: null }
      }

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

      const studentCard = await buildStudentCard(payload, student, req)

      return {
        session: activeSessionSummary,
        availableSessions,
        claim: {
          token: claim.token,
          student: studentCard,
          session: activeSessionSummary,
          expiresAt: claim.expiresAt,
        },
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
    postponedUntil?: string
  },
) {
  const { payload, ceremonyId, outcome } = input
  const actor = await authorize(payload, input.user, roles, input.req)

  const validOutcomes: InvitationOutcome[] = [
    'accepted',
    'no_answer',
    'declined',
    'postponed',
    'needs_alternative_session',
    'no_answer_sms',
    'failed',
  ]
  if (!validOutcomes.includes(outcome)) throw new DomainError('نتیجه دعوت معتبر نیست.')

  return transaction(
    payload,
    actor,
    `inviter:${actor.id}`,
    async (req) => {
      await authorize(payload, actor, roles, req)

      const now = new Date().toISOString()
      const claims = await payload.find({
        collection: 'invitation-claims',
        where: {
          and: [
            { token: { equals: input.claimToken } },
            { ceremony: { equals: ceremonyId } },
            { inviter: { equals: actor.id } },
            { expiresAt: { greater_than: now } },
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

      // Target session validation: must belong to the ceremony and not be draft/cancelled
      const targetSession = await payload.findByID({
        collection: 'sessions',
        id: input.sessionId,
        depth: 0,
        req,
      })
      if (!targetSession || relationID(targetSession.ceremony) !== ceremonyId) {
        throw new DomainError('سانس انتخابی نامعتبر است.', 422)
      }
      if (['draft', 'cancelled'].includes(targetSession.status)) {
        throw new DomainError('ثبت در این سانس امکان‌پذیر نیست.', 422)
      }
      if (outcome === 'accepted' && ['sealed', 'completed'].includes(targetSession.status)) {
        throw new DomainError('این سانس بسته شده است و امکان پذیرش جدید در آن وجود ندارد.', 409)
      }

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

      if (
        previous &&
        previous.outcome !== 'needs_alternative_session' &&
        previous.outcome !== 'no_answer' &&
        previous.outcome !== 'postponed'
      ) {
        throw new DomainError('نتیجه این دعوت قبلاً ثبت شده است.', 409)
      }

      const processedAt = new Date().toISOString()
      const attempt = {
        outcome,
        inviter: actor.id,
        processedAt,
        session: targetSession.id,
        note: input.note || '',
      }

      const isSmsRequired = outcome === 'accepted' || outcome === 'no_answer_sms'

      const data = {
        student: student.id,
        ceremony: ceremonyId,
        processedSession: targetSession.id,
        assignedSession: outcome === 'accepted' ? targetSession.id : null,
        inviter: actor.id,
        outcome,
        note: input.note,
        postponedUntil:
          outcome === 'postponed'
            ? input.postponedUntil || new Date(Date.now() + 60 * 60 * 1000).toISOString()
            : null,
        processedAt,
        smsStatus: isSmsRequired ? ('queued' as const) : ('not_required' as const),
        attempts: [...(Array.isArray(previous?.attempts) ? previous.attempts : []), attempt],
      }

      const invitation: Invitation = previous
        ? await payload.update({ collection: 'invitations', id: previous.id, data, req })
        : await payload.create({ collection: 'invitations', data, req })

      if (isSmsRequired) {
        await payload.jobs.queue({ task: 'send-sms', input: { invitationId: invitation.id }, req })
      }

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
