import type { Payload, PayloadRequest, Where } from 'payload'
import type { ReceptionSearch, ReceptionStudent } from '@rasad/contracts'
import type { Student, User } from '@/payload-types'
import {
  authorize,
  digits,
  DomainError,
  lockTransaction,
  normalizePhone,
  relationID,
  transaction,
} from '../shared/core'

type Input = {
  payload: Payload
  user: User | null | undefined
  sessionId: number
  req?: PayloadRequest
}
const roles: User['role'][] = ['receptionist', 'admin', 'employee']

function name(value: string): string {
  return value.normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim().replace(/\s+/g, ' ')
}

async function context({ payload, sessionId, req }: Input) {
  const session = await payload.findByID({
    collection: 'sessions',
    id: sessionId,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const ceremony = await payload.findByID({
    collection: 'ceremonies',
    id: relationID(session.ceremony),
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (
    !['filling', 'sealed', 'active'].includes(session.status) ||
    !['active', 'inviting', 'scheduled'].includes(ceremony.status)
  )
    throw new DomainError('پذیرش برای این سانس فعال نیست.', 409)
  return { session, ceremony }
}

async function lockedContext(input: Input & { req: PayloadRequest }) {
  const before = await context(input)
  await lockTransaction(input.payload, input.req, `ceremony:${before.ceremony.id}`)
  const current = await context(input)
  if (current.ceremony.id !== before.ceremony.id)
    throw new DomainError('سانس تغییر کرده است؛ دوباره تلاش کنید.', 409)
  return current
}

async function cards(
  input: Input,
  students: Student[],
  ceremonyId: number,
): Promise<ReceptionStudent[]> {
  if (!students.length) return []
  const { payload, req, sessionId } = input
  const ids = students.map((student) => student.id)

  const ceremonySessions = await payload.find({
    collection: 'sessions',
    where: { ceremony: { equals: ceremonyId } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const ceremonySessionIds = ceremonySessions.docs.map((s) => s.id)

  const [invitations, currentCheckins, otherCheckins, neighborhoods] = await Promise.all([
    payload.find({
      collection: 'invitations',
      where: {
        and: [
          { ceremony: { equals: ceremonyId } },
          { student: { in: ids } },
          { outcome: { equals: 'accepted' } },
        ],
      },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    }),
    payload.find({
      collection: 'session-checkins',
      where: { and: [{ session: { equals: sessionId } }, { student: { in: ids } }] },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    }),
    payload.find({
      collection: 'session-checkins',
      where: {
        and: [
          { student: { in: ids } },
          { session: { in: ceremonySessionIds } },
          { session: { not_equals: sessionId } },
        ],
      },
      pagination: false,
      depth: 1,
      overrideAccess: true,
      req,
    }),
    payload.find({
      collection: 'neighborhoods',
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    }),
  ])

  const sessionIds = invitations.docs.flatMap((item) =>
    item.assignedSession ? [relationID(item.assignedSession)] : [],
  )
  const sessions = sessionIds.length
    ? await payload.find({
        collection: 'sessions',
        where: { id: { in: sessionIds } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
    : { docs: [] }

  return students.map((student) => {
    const invitation = invitations.docs.find((item) => relationID(item.student) === student.id)
    const assigned = invitation?.assignedSession ? relationID(invitation.assignedSession) : null
    const phone = student.mobile || student.motherMobile || student.fatherMobile

    const otherCheckin = otherCheckins.docs.find((item) => relationID(item.student) === student.id)
    let previousCheckin = null
    if (otherCheckin) {
      const sessObj =
        typeof otherCheckin.session === 'object' && otherCheckin.session !== null
          ? otherCheckin.session
          : null
      previousCheckin = {
        ceremonyTitle: 'این مراسم',
        sessionTitle: sessObj?.title || 'سانس دیگر',
        checkedInAt: otherCheckin.checkedInAt,
      }
    }

    const nId = student.neighborhood ? relationID(student.neighborhood) : null
    const nName = neighborhoods.docs.find((n) => n.id === nId)?.name || null

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      grade: student.grade,
      phone: phone ? `*******${phone.slice(-4)}` : null,
      mobile: student.mobile,
      motherMobile: student.motherMobile,
      fatherMobile: student.fatherMobile,
      landline: student.landline,
      neighborhoodId: nId,
      neighborhoodName: nName,
      address: student.address,
      referrer: student.referrer,
      notes: student.notes,
      assignedSessionId: assigned,
      assignedSessionTitle: sessions.docs.find((item) => item.id === assigned)?.title,
      checkedIn: currentCheckins.docs.some((item) => relationID(item.student) === student.id),
      previousCheckin,
    }
  })
}

export async function searchReceptionStudents(
  input: Input & { q: string },
): Promise<ReceptionSearch> {
  const { payload, req } = input
  await authorize(payload, input.user, roles, req)
  const { ceremony } = await context(input)
  const q = name(digits(input.q))
  if (q.length < 2 || q.length > 100)
    throw new DomainError('برای جستجو بین ۲ تا ۱۰۰ نویسه وارد کنید.')
  const compactPhone = q.replace(/[\s()+-]/g, '')
  const phone = /^(?:98|0098)9\d{9}$/.test(compactPhone)
    ? `0${compactPhone.replace(/^(?:0098|98)/, '')}`
    : compactPhone
  const where: Where = /^\d+$/.test(phone)
    ? {
        or: ['mobile', 'motherMobile', 'fatherMobile'].map((field) => ({
          [field]: { contains: phone },
        })),
      }
    : {
        and: q.split(' ').map((part): Where => ({
          or: [{ firstName: { contains: part } }, { lastName: { contains: part } }],
        })),
      }
  const students = await payload.find({
    collection: 'students',
    where,
    limit: 20,
    sort: 'lastName',
    depth: 0,
    overrideAccess: true,
    req,
  })
  return { students: await cards(input, students.docs, ceremony.id) }
}

async function record(
  input: Input & { user: User; studentId: number; req: PayloadRequest },
  ceremonyId: number,
) {
  const { payload, sessionId, studentId, user, req } = input
  const existing = await payload.find({
    collection: 'session-checkins',
    where: { and: [{ student: { equals: studentId } }, { session: { equals: sessionId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (existing.docs.length) throw new DomainError('حضور این دانش‌آموز قبلاً ثبت شده است.', 409)
  const invitations = await payload.find({
    collection: 'invitations',
    where: {
      and: [
        { student: { equals: studentId } },
        { ceremony: { equals: ceremonyId } },
        { outcome: { equals: 'accepted' } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const invitation = invitations.docs[0]
  const checkin = await payload.create({
    collection: 'session-checkins',
    data: {
      student: studentId,
      session: sessionId,
      checkedInBy: user.id,
      checkedInAt: new Date().toISOString(),
      source: invitation ? 'invited' : 'walk_in',
    },
    overrideAccess: true,
    req,
  })
  return {
    id: checkin.id,
    studentId,
    sessionId,
    differentSession: Boolean(
      invitation?.assignedSession && relationID(invitation.assignedSession) !== sessionId,
    ),
  }
}

export async function checkInStudent(
  input: Input & { studentId: number; forceOverride?: boolean },
) {
  const user = await authorize(input.payload, input.user, roles, input.req)
  return transaction(
    input.payload,
    user,
    'reception',
    async (req) => {
      const current = await authorize(input.payload, user, roles, req)
      const { ceremony } = await lockedContext({ ...input, req })
      await input.payload.findByID({
        collection: 'students',
        id: input.studentId,
        depth: 0,
        overrideAccess: true,
        req,
      })

      // Multi-attendance enforcement for ceremonies with 'single' attendance policy
      if (ceremony.attendancePolicy === 'single' && !input.forceOverride) {
        const ceremonySessions = await input.payload.find({
          collection: 'sessions',
          where: { ceremony: { equals: ceremony.id } },
          pagination: false,
          depth: 0,
          overrideAccess: true,
          req,
        })
        const sessionIds = ceremonySessions.docs.map((s) => s.id)
        const previousCheckin = await input.payload.find({
          collection: 'session-checkins',
          where: {
            and: [
              { student: { equals: input.studentId } },
              { session: { in: sessionIds } },
              { session: { not_equals: input.sessionId } },
            ],
          },
          limit: 1,
          depth: 1,
          overrideAccess: true,
          req,
        })

        if (previousCheckin.docs.length) {
          const prev = previousCheckin.docs[0]
          const prevSession =
            typeof prev.session === 'object' && prev.session !== null ? prev.session : null
          throw new DomainError(
            'این دانش‌آموز قبلاً در یکی از سانس‌های این مراسم حضور یافته است.',
            409,
            [
              {
                ceremonyTitle: ceremony.title,
                sessionTitle: prevSession?.title || 'سانس',
                checkedInAt: prev.checkedInAt,
              },
            ],
          )
        }
      }

      return record({ ...input, user: current, req }, ceremony.id)
    },
    input.req,
  )
}

export async function quickCreateAndCheckInStudent(
  input: Input & {
    firstName: string
    lastName: string
    grade?: number
    mobile?: string
    motherMobile?: string
    fatherMobile?: string
    landline?: string
    neighborhoodId?: number
    address?: string
    referrer?: string
    notes?: string
    isClassSeeker?: boolean
    allowSharedPhone?: boolean
  },
) {
  const { payload } = input
  const user = await authorize(payload, input.user, roles, input.req)
  const firstName = name(input.firstName),
    lastName = name(input.lastName)
  if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100)
    throw new DomainError('نام و نام خانوادگی معتبر وارد کنید.')
  if (
    input.grade !== undefined &&
    (!Number.isInteger(input.grade) || input.grade < 1 || input.grade > 6)
  )
    throw new DomainError('پایه باید عددی بین ۱ تا ۶ باشد.')

  const phones = {
    mobile: input.mobile?.trim() ? normalizePhone(input.mobile) : undefined,
    motherMobile: input.motherMobile?.trim() ? normalizePhone(input.motherMobile) : undefined,
    fatherMobile: input.fatherMobile?.trim() ? normalizePhone(input.fatherMobile) : undefined,
  }

  const cleanedLandline = input.landline?.trim() || undefined

  return transaction(
    payload,
    user,
    'reception',
    async (req) => {
      const current = await authorize(payload, user, roles, req)
      const { ceremony } = await lockedContext({ ...input, req })

      const matches = await payload.find({
        collection: 'students',
        where: {
          and: [{ firstName: { equals: firstName } }, { lastName: { equals: lastName } }],
        },
        limit: 10,
        depth: 0,
        overrideAccess: true,
        req,
      })
      if (matches.docs.length) {
        throw new DomainError(
          'دانش‌آموزی با همین نام و نام خانوادگی قبلاً ثبت شده است.',
          409,
          await cards({ ...input, req }, matches.docs, ceremony.id),
        )
      }

      const student = await payload.create({
        collection: 'students',
        data: {
          firstName,
          lastName,
          grade: input.grade,
          ...phones,
          landline: cleanedLandline,
          neighborhood: input.neighborhoodId,
          address: input.address?.trim() || undefined,
          referrer: input.referrer?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
          origin: 'reception_walk_in',
          lifecycleStatus: input.isClassSeeker ? 'class_seeker' : 'unknown',
          readinessStatus: 'normal',
        },
        overrideAccess: true,
        req,
      })

      return record({ ...input, studentId: student.id, user: current, req }, ceremony.id)
    },
    input.req,
  )
}

export async function updateReceptionStudent(
  input: Input & {
    studentId: number
    firstName?: string
    lastName?: string
    grade?: number | null
    mobile?: string | null
    motherMobile?: string | null
    fatherMobile?: string | null
    landline?: string | null
    neighborhoodId?: number | null
    address?: string | null
    referrer?: string | null
    notes?: string | null
    isClassSeeker?: boolean
  },
) {
  const { payload } = input
  await authorize(payload, input.user, roles, input.req)

  return transaction(
    payload,
    input.user as User,
    `student:${input.studentId}`,
    async (req) => {
      await authorize(payload, input.user, roles, req)

      const updateData: Record<string, unknown> = {}
      if (input.firstName !== undefined) updateData.firstName = name(input.firstName)
      if (input.lastName !== undefined) updateData.lastName = name(input.lastName)
      if (input.grade !== undefined) updateData.grade = input.grade
      if (input.mobile !== undefined)
        updateData.mobile = input.mobile?.trim() ? normalizePhone(input.mobile) : null
      if (input.motherMobile !== undefined)
        updateData.motherMobile = input.motherMobile?.trim()
          ? normalizePhone(input.motherMobile)
          : null
      if (input.fatherMobile !== undefined)
        updateData.fatherMobile = input.fatherMobile?.trim()
          ? normalizePhone(input.fatherMobile)
          : null
      if (input.landline !== undefined)
        updateData.landline = input.landline?.trim() || null
      if (input.neighborhoodId !== undefined) updateData.neighborhood = input.neighborhoodId
      if (input.address !== undefined) updateData.address = input.address?.trim() || null
      if (input.referrer !== undefined) updateData.referrer = input.referrer?.trim() || null
      if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null
      if (input.isClassSeeker !== undefined) {
        if (input.isClassSeeker) {
          updateData.lifecycleStatus = 'class_seeker'
        }
      }

      const updated = await payload.update({
        collection: 'students',
        id: input.studentId,
        data: updateData,
        overrideAccess: true,
        req,
      })

      return { student: updated }
    },
    input.req,
  )
}
