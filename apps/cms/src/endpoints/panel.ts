import type { Endpoint, PayloadRequest } from 'payload'
import { authorize, DomainError } from '../domain/shared/core'
import {
  getNextCeremonyInvite,
  submitInvitationOutcome,
} from '../domain/invitations/invitation-service'
import {
  advanceCeremonySession,
  reopenCeremonySession,
  getSessionTelemetry,
} from '../domain/ceremonies/session-service'
import { getTeacherRoster, updateTeacherStudent } from '../domain/teacher/teacher-service'
import {
  searchReceptionStudents,
  checkInStudent,
  quickCreateAndCheckInStudent,
  updateReceptionStudent,
} from '../domain/reception/reception-service'
import type { InvitationOutcome } from '@rasad/contracts'
import type { Session } from '@/payload-types'

function id(value: unknown): number {
  const number = typeof value === 'string' ? Number(value) : value
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 1)
    throw new DomainError('شناسه معتبر نیست.')
  return number
}
function text(value: unknown, required = false, max = 1000): string | undefined {
  if (value == null && !required) return undefined
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new DomainError('اطلاعات واردشده معتبر نیست.')
  return value.trim()
}
function endpoint(
  path: string,
  method: 'get' | 'post',
  handler: (req: PayloadRequest, body: Record<string, unknown>) => Promise<unknown>,
): Endpoint {
  return {
    path,
    method,
    handler: async (req) => {
      try {
        if (!req.user) throw new DomainError('لطفاً وارد شوید.', 401)
        if (method === 'post') {
          const origin = req.headers.get('origin')
          const allowedOrigins = [
            process.env.PUBLIC_ORIGIN,
            process.env.PANEL_ORIGIN,
            req.url ? new URL(req.url).origin : null,
            process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
            process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
            process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:5173' : null,
            process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3000' : null,
          ].filter(Boolean) as string[]

          if (origin && !allowedOrigins.includes(origin))
            throw new DomainError('مبدأ درخواست معتبر نیست.', 403)
          if (!req.headers.get('content-type')?.includes('application/json'))
            throw new DomainError('قالب درخواست معتبر نیست.', 422)
        }
        const raw: unknown = method === 'post' ? await req.json!() : {}
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
          throw new DomainError('درخواست معتبر نیست.')
        return Response.json(await handler(req, raw as Record<string, unknown>), {
          headers: { 'Cache-Control': 'no-store' },
        })
      } catch (error) {
        const status =
          error instanceof DomainError
            ? error.status
            : error &&
                typeof error === 'object' &&
                'status' in error &&
                typeof error.status === 'number'
              ? error.status
              : 500
        req.payload.logger[status >= 500 ? 'error' : 'warn']({
          event: 'workflow_failure',
          path,
          status,
          userId: req.user?.id,
          ...(status >= 500 ? { err: error } : {}),
        })
        return Response.json(
          {
            error:
              status >= 500
                ? 'خطای موقت سرور؛ دوباره تلاش کنید.'
                : error instanceof Error
                  ? error.message
                  : 'عملیات انجام نشد.',
            ...(error instanceof DomainError && error.candidates
              ? { candidates: error.candidates }
              : {}),
          },
          { status, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    },
  }
}
export const panelEndpoints: Endpoint[] = [
  endpoint('/panel/context', 'get', async (req) => {
    await authorize(req.payload, req.user, ['admin', 'employee', 'inviter', 'receptionist'], req)
    const [ceremonies, neighborhoods] = await Promise.all([
      req.payload.find({
        collection: 'ceremonies',
        where: { status: { in: ['scheduled', 'inviting', 'active'] } },
        sort: 'createdAt',
        limit: 100,
        depth: 0,
        req,
      }),
      req.payload.find({
        collection: 'neighborhoods',
        pagination: false,
        sort: 'name',
        depth: 0,
        req,
      }),
    ])

    const sessions = await req.payload.find({
      collection: 'sessions',
      where: {
        and: [
          { ceremony: { in: ceremonies.docs.map((c) => c.id) } },
          { status: { not_in: ['draft', 'cancelled', 'completed'] } },
        ],
      },
      pagination: false,
      sort: ['startsAt', 'id'],
      depth: 0,
      req,
    })

    const sessionsWithStats = await Promise.all(
      sessions.docs.map(async (s: Session) => {
        const stats = await getSessionTelemetry(req.payload, s.id, req)
        return {
          id: s.id,
          ceremonyId:
            typeof s.ceremony === 'object' && s.ceremony !== null
              ? s.ceremony.id
              : (s.ceremony as number),
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

    return {
      ceremonies: ceremonies.docs.map((c) => ({
        id: c.id,
        title: c.title,
        attendancePolicy: c.attendancePolicy,
        sessions: sessionsWithStats
          .filter((s) => s.ceremonyId === c.id)
          .map((s) => ({
            id: s.id,
            title: s.title,
            startsAt: s.startsAt,
            endsAt: s.endsAt,
            status: s.status,
            capacity: s.capacity,
            acceptedCount: s.acceptedCount,
            checkedInCount: s.checkedInCount,
          })),
      })),
      neighborhoods: neighborhoods.docs.map((n) => ({
        id: n.id,
        name: n.name,
      })),
    }
  }),
  endpoint('/panel/invite/claim', 'post', (req, b) =>
    getNextCeremonyInvite({
      payload: req.payload,
      user: req.user,
      ceremonyId: id(b.ceremonyId),
      req,
    }),
  ),
  endpoint('/panel/invite/submit', 'post', (req, b) =>
    submitInvitationOutcome({
      payload: req.payload,
      user: req.user,
      ceremonyId: id(b.ceremonyId),
      sessionId: id(b.sessionId),
      claimToken: text(b.claimToken, true, 100)!,
      outcome: text(b.outcome, true, 50) as InvitationOutcome,
      note: text(b.note),
      postponedUntil: text(b.postponedUntil),
      req,
    }),
  ),
  endpoint('/panel/ceremony/advance', 'post', (req, b) =>
    advanceCeremonySession({
      payload: req.payload,
      user: req.user,
      ceremonyId: id(b.ceremonyId),
      expectedSessionId: b.expectedSessionId === null ? null : id(b.expectedSessionId),
      req,
    }),
  ),
  endpoint('/panel/ceremony/reopen', 'post', (req, b) =>
    reopenCeremonySession({
      payload: req.payload,
      user: req.user,
      ceremonyId: id(b.ceremonyId),
      sessionId: id(b.sessionId),
      req,
    }),
  ),
  endpoint('/panel/teacher', 'get', (req) =>
    getTeacherRoster({ payload: req.payload, user: req.user, req }),
  ),
  endpoint('/panel/teacher/status', 'post', (req, b) => {
    if (b.status !== 'absorbed' && b.status !== 'removed')
      throw new DomainError('وضعیت معتبر نیست.')
    return updateTeacherStudent({
      payload: req.payload,
      user: req.user,
      studentId: id(b.studentId),
      status: b.status,
      reason: text(b.reason),
      req,
    })
  }),
  endpoint('/panel/reception/search', 'get', (req) => {
    const params = new URL(req.url!).searchParams
    return searchReceptionStudents({
      payload: req.payload,
      user: req.user,
      sessionId: id(params.get('sessionId')),
      q: text(params.get('q'), true, 100)!,
      req,
    })
  }),
  endpoint('/panel/reception/checkin', 'post', (req, b) =>
    checkInStudent({
      payload: req.payload,
      user: req.user,
      studentId: id(b.studentId),
      sessionId: id(b.sessionId),
      forceOverride: Boolean(b.forceOverride),
      req,
    }),
  ),
  endpoint('/panel/reception/walkin', 'post', (req, b) =>
    quickCreateAndCheckInStudent({
      payload: req.payload,
      user: req.user,
      sessionId: id(b.sessionId),
      firstName: text(b.firstName, true, 100)!,
      lastName: text(b.lastName, true, 100)!,
      grade: b.grade == null ? undefined : id(b.grade),
      mobile: text(b.mobile, false, 30),
      motherMobile: text(b.motherMobile, false, 30),
      fatherMobile: text(b.fatherMobile, false, 30),
      landline: text(b.landline, false, 30),
      neighborhoodId: b.neighborhoodId == null ? undefined : id(b.neighborhoodId),
      address: text(b.address, false, 500),
      referrer: text(b.referrer, false, 100),
      notes: text(b.notes, false, 1000),
      isClassSeeker: Boolean(b.isClassSeeker),
      allowSharedPhone: Boolean(b.allowSharedPhone),
      req,
    }),
  ),
  endpoint('/panel/reception/student/update', 'post', (req, b) =>
    updateReceptionStudent({
      payload: req.payload,
      user: req.user,
      sessionId: id(b.sessionId || 1),
      studentId: id(b.studentId),
      firstName: text(b.firstName, false, 100),
      lastName: text(b.lastName, false, 100),
      grade: b.grade == null ? undefined : id(b.grade),
      mobile: text(b.mobile, false, 30),
      motherMobile: text(b.motherMobile, false, 30),
      fatherMobile: text(b.fatherMobile, false, 30),
      landline: text(b.landline, false, 30),
      neighborhoodId: b.neighborhoodId == null ? undefined : id(b.neighborhoodId),
      address: text(b.address, false, 500),
      referrer: text(b.referrer, false, 100),
      notes: text(b.notes, false, 1000),
      isClassSeeker: b.isClassSeeker === undefined ? undefined : Boolean(b.isClassSeeker),
      req,
    }),
  ),
]
