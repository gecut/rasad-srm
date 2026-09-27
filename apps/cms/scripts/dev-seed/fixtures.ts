import assert from 'node:assert/strict'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import type { Class, Student, User, Session, Ceremony, Invitation } from '../../src/payload-types'
import { lockTransaction, relationID } from '../../src/domain/shared/core'
import { stabilizationAllowed } from '../../src/domain/shared/lifecycle'

export const prefix = 'نمونه رصد · '
export const surnameTag = 'نمونه‌رصد'
export const password = 'RasadDev123!'
export const markerEmail = 'admin@seed.rasad.invalid'
export const accounts: {
  key: string
  name: string
  role: User['role']
  phone: string
  teacher?: number
}[] = [
  { key: 'admin', name: 'آرمان مدیر', role: 'admin', phone: '09000000001' },
  { key: 'employee', name: 'نگار هماهنگ', role: 'employee', phone: '09000000002' },
  { key: 'followup', name: 'مریم پیگیر', role: 'follow_up_specialist', phone: '09000000003' },
  { key: 'inviter-a', name: 'سارا دعوت', role: 'inviter', phone: '09000000004' },
  { key: 'inviter-b', name: 'رضا دعوت', role: 'inviter', phone: '09000000005' },
  { key: 'teacher-a', name: 'امیر دانا', role: 'teacher', phone: '09000000006', teacher: 0 },
  { key: 'teacher-b', name: 'نیما فرهی', role: 'teacher', phone: '09000000007', teacher: 1 },
  { key: 'teacher-c', name: 'پگاه روشن', role: 'teacher', phone: '09000000008', teacher: 2 },
  { key: 'reception-a', name: 'لیلا پذیرش', role: 'receptionist', phone: '09000000009' },
  { key: 'reception-b', name: 'سامان پذیرش', role: 'receptionist', phone: '09000000010' },
]
export const classStatuses: Class['status'][] = [
  'active',
  'active',
  'admissions_paused',
  'transition_to_preliminaries',
  'planned',
  'suspended',
  'ended',
  'cancelled',
]
export const lifecycles: Student['lifecycleStatus'][] = [
  'unknown',
  'class_seeker',
  'referred_to_teacher',
  'absorbed',
  'stabilized',
  'removed',
]
export const ceremonyStatuses: Ceremony['status'][] = [
  'inviting',
  'scheduled',
  'active',
  'completed',
  'cancelled',
  'draft',
]
const firstNames = [
  'علی',
  'محمد',
  'امیر',
  'حسین',
  'رضا',
  'آرین',
  'پارسا',
  'سامان',
  'کیان',
  'مهدی',
  'یاسین',
  'سینا',
]
const lastNames = ['رضایی', 'احمدی', 'کریمی', 'مرادی', 'صادقی', 'نوری']
const notes = [
  'با خانواده درباره برنامه کلاس گفت‌وگو شد؛ زمان عصر مناسب‌تر است.',
  'مدرس حضور منظم دانش‌آموز را تأیید کرد؛ پیگیری هفته آینده انجام شود.',
  'خانواده خواهان کلاس نزدیک‌تر هستند؛ تا هماهنگی بعدی در فهرست انتظار بماند.',
]

export function dates(now: Date) {
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const base = new Date(`${local}T17:30:00+03:30`).getTime()
  return (days: number, hours = 0) =>
    new Date(base + days * 86400000 + hours * 3600000).toISOString()
}

/** Historical snapshots use trusted Local API, with hooks and a single atomic transaction.
 * No live outcome service is called here: it would enqueue outbound SMS and own another transaction.
 */
export async function seedDevelopment(
  payload: Payload,
  now = new Date(),
): Promise<'created' | 'unchanged'> {
  const transactionID = await payload.db.beginTransaction()
  assert(transactionID, 'PostgreSQL transactions required')
  try {
    const req = await createLocalReq({ context: { domainAction: true } }, payload)
    req.transactionID = transactionID
    await lockTransaction(payload, req, 'rasad-development-seed-v1')
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: markerEmail } },
      limit: 1,
      depth: 0,
      req,
    })
    if (existing.docs.length) {
      assert.equal(
        existing.docs[0].name,
        prefix + accounts[0].name,
        'Seed marker collision; no data changed',
      )
      await payload.db.commitTransaction(transactionID)
      return 'unchanged'
    }
    const collisions = await payload.count({
      collection: 'users',
      where: {
        or: [
          { username: { in: accounts.map((a) => a.phone) } },
          { email: { contains: '@seed.rasad.invalid' } },
        ],
      },
      req,
    })
    assert.equal(
      collisions.totalDocs,
      0,
      'Seed account collision; no existing account will be overwritten',
    )
    const existingStudents = await payload.count({
      collection: 'students',
      where: { lastName: { contains: surnameTag } },
      req,
    })
    const existingCeremonies = await payload.count({
      collection: 'ceremonies',
      where: { title: { contains: prefix } },
      req,
    })
    assert.equal(
      existingStudents.totalDocs + existingCeremonies.totalDocs,
      0,
      'Seed records exist without marker; refusing to duplicate them',
    )
    const at = dates(now)
    const teachers = []
    for (const [i, name] of ['دانا', 'فرهی', 'روشن', 'آزاد'].entries()) {
      teachers.push(
        await payload.create({
          collection: 'teachers',
          data: {
            firstName: ['امیر', 'نیما', 'پگاه', 'بهرام'][i],
            lastName: `${name} ${surnameTag}`,
            mobile: `0900000010${i}`,
            status: i === 3 ? 'inactive' : 'active',
          },
          req,
        }),
      )
    }
    const users: User[] = []
    for (const account of accounts) {
      users.push(
        await payload.create({
          collection: 'users',
          data: {
            name: prefix + account.name,
            email: `${account.key}@seed.rasad.invalid`,
            username: account.phone,
            password,
            role: account.role,
            status: 'active',
            ...(account.teacher !== undefined
              ? { teacherProfile: teachers[account.teacher].id }
              : {}),
          },
          req,
        }),
      )
    }
    req.user = { ...users[0], collection: 'users' }
    const classes: Class[] = []
    for (const [i, status] of classStatuses.entries()) {
      classes.push(
        await payload.create({
          collection: 'classes',
          data: {
            title:
              prefix +
              [
                'اندیشه بهار',
                'رویش تابستان',
                'گفت‌وگوی نوجوان',
                'پل مقدمات',
                'آغاز پاییز',
                'پژوهش زمستان',
                'دوستی دوره پیشین',
                'مهارت دوره لغوشده',
              ][i],
            primaryTeacher: teachers[i % 3].id,
            assistantTeachers: [teachers[(i + 1) % 3].id],
            status,
          },
          req,
        }),
      )
    }
    const students: Student[] = []
    for (let i = 0; i < 72; i++) {
      const lifecycleStatus = lifecycles[i % 6]
      const assigned = ['referred_to_teacher', 'absorbed', 'stabilized'].includes(lifecycleStatus)
      // Vary ownership independently of lifecycle so each teacher has actionable referrals.
      const classroom = classes[Math.floor(i / 6) % 4]
      students.push(
        await payload.create({
          collection: 'students',
          data: {
            firstName: i === 1 ? 'علی' : firstNames[i % 12],
            lastName: `${lastNames[Math.floor(i / 12)]} ${surnameTag}`,
            mobile: i % 10 === 9 ? undefined : `0900010${String(i).padStart(4, '0')}`,
            motherMobile: i % 3 === 0 ? `0900020${String(i).padStart(4, '0')}` : undefined,
            fatherMobile: i % 4 === 0 ? `0900030${String(i).padStart(4, '0')}` : undefined,
            grade: ((Math.floor(i / 6) + i) % 6) + 1,
            lifecycleStatus,
            readinessStatus: i % 6 === 1 ? 'waitlisted' : 'normal',
            origin: i % 3 === 0 ? 'import' : 'admin',
            ...(assigned
              ? {
                  currentClass: classroom.id,
                  referredAt: at(lifecycleStatus === 'stabilized' ? -250 : -45),
                }
              : {}),
            ...(lifecycleStatus === 'absorbed' ? { absorbedAt: at(-30) } : {}),
            ...(lifecycleStatus === 'stabilized'
              ? { absorbedAt: at(-240), stabilizedAt: at(-30) }
              : {}),
            ...(lifecycleStatus === 'removed'
              ? { removedReason: 'خانواده به شهر دیگری نقل مکان کرده‌اند.' }
              : {}),
          },
          req,
        }),
      )
    }
    for (let i = 0; i < 3; i++)
      students.push(
        await payload.create({
          collection: 'students',
          data: {
            firstName: ['آرش', 'بردیا', 'شایان'][i],
            lastName: `حضوری ${surnameTag}`,
            origin: 'reception_walk_in',
            lifecycleStatus: 'unknown',
            readinessStatus: 'normal',
          },
          req,
        }),
      )
    for (let i = 0; i < 18; i++)
      for (let n = 0; n < (i % 3) + 1; n++) {
        await payload.create({
          collection: 'follow-ups',
          data: {
            student: students[i].id,
            specialist: users[n % 3].id,
            note: notes[n],
            createdAt: at(-20 + n * 5),
            updatedAt: at(-20 + n * 5),
          },
          req,
        })
      }
    const ceremonies: Ceremony[] = []
    const sessions: Session[][] = []
    const statuses: Session['status'][][] = [
      ['sealed', 'filling', 'queued', 'queued'],
      ['filling', 'queued', 'queued'],
      ['active', 'filling', 'queued'],
      ['completed', 'completed'],
      ['cancelled', 'cancelled'],
      ['draft', 'draft'],
    ]
    for (const [i, status] of ceremonyStatuses.entries()) {
      const ceremony = await payload.create({
        collection: 'ceremonies',
        data: {
          title:
            prefix +
            [
              'دیدار خانواده‌ها',
              'جشن آشنایی آینده',
              'گردهمایی امروز',
              'یادگار بهار',
              'برنامه لغوشده',
              'پیشنهاد نشست فرهنگی',
            ][i],
          description: 'داده ساختگی توسعه؛ هیچ شماره یا پیامکی برای تماس واقعی نیست.',
          status,
        },
        req,
      })
      ceremonies.push(ceremony)
      sessions.push([])
      for (const [j, sessionStatus] of statuses[i].entries()) {
        const day = [-1, 30, 0, -60, 15, 45][i] + j
        sessions[i].push(
          await payload.create({
            collection: 'sessions',
            data: {
              title: prefix + `نوبت ${j + 1}`,
              ceremony: ceremony.id,
              startsAt: at(day),
              endsAt: at(day, 2),
              status: sessionStatus,
              ...(sessionStatus === 'sealed' ||
              sessionStatus === 'completed' ||
              sessionStatus === 'active'
                ? { fillingStartedAt: at(day - 10) }
                : {}),
            },
            req,
          }),
        )
      }
    }
    const invitations: Invitation[] = []
    async function invite(
      student: Student,
      ceremonyIndex: number,
      sessionIndex: number,
      outcome: Invitation['outcome'],
      smsStatus: Invitation['smsStatus'] = 'not_required',
    ) {
      const session = sessions[ceremonyIndex][sessionIndex]
      const processedAt =
        session.status === 'filling' ? new Date().toISOString() : at(ceremonyIndex === 3 ? -65 : -2)
      const inviter = users[3 + (invitations.length % 2)]
      const note =
        outcome === 'needs_alternative_session'
          ? 'خانواده زمان دیگری را ترجیح می‌دهند.'
          : 'سابقه ساختگی برای بررسی جریان دعوت؛ پیامکی ارسال نشده است.'
      const attempt = { outcome, inviter: inviter.id, session: session.id, processedAt, note }
      invitations.push(
        await payload.create({
          collection: 'invitations',
          data: {
            student: student.id,
            ceremony: ceremonies[ceremonyIndex].id,
            processedSession: session.id,
            assignedSession: outcome === 'accepted' ? session.id : null,
            inviter: inviter.id,
            outcome,
            smsStatus,
            processedAt,
            note,
            attempts:
              ceremonyIndex === 0 && sessionIndex === 1 && student.id === students[3].id
                ? [
                    {
                      outcome: 'needs_alternative_session',
                      inviter: users[3].id,
                      session: sessions[0][0].id,
                      processedAt: at(-2),
                      note: 'زمان سانس قبلی مناسب نبود.',
                    },
                    attempt,
                  ]
                : [attempt],
          },
          req,
        }),
      )
    }
    // Active ceremony: accepted in both previous and current Session; alternatives before/after advancement.
    for (const index of [0, 1, 2]) await invite(students[index], 0, 0, 'accepted')
    for (const index of [3, 4, 6]) await invite(students[index], 0, 1, 'accepted')
    await invite(students[7], 0, 0, 'needs_alternative_session')
    await invite(students[8], 0, 1, 'needs_alternative_session')
    for (const [index, status] of [
      [10, 'queued'],
      [12, 'sent'],
      [13, 'failed'],
    ] as const)
      await invite(students[index], 0, 0, 'no_answer_sms', status)
    await invite(students[14], 0, 0, 'failed')
    for (const [index, outcome] of [
      'accepted',
      'needs_alternative_session',
      'no_answer_sms',
      'failed',
    ].entries())
      await invite(
        students[24 + index],
        3,
        0,
        outcome as Invitation['outcome'],
        outcome === 'no_answer_sms' ? 'sent' : 'not_required',
      )
    const attendance = [
      [0, 0, 0],
      [1, 0, 1],
      [18, 0, 1],
      [72, 0, 1],
      [73, 0, 1],
      [74, 0, 1],
      [24, 3, 0],
      [30, 3, 1],
    ]
    for (const [i, [studentIndex, ceremonyIndex, sessionIndex]] of attendance.entries()) {
      const accepted = invitations.some(
        (item) =>
          relationID(item.student) === students[studentIndex].id &&
          relationID(item.ceremony) === ceremonies[ceremonyIndex].id &&
          item.outcome === 'accepted',
      )
      await payload.create({
        collection: 'session-checkins',
        data: {
          student: students[studentIndex].id,
          session: sessions[ceremonyIndex][sessionIndex].id,
          checkedInBy: users[8 + (i % 2)].id,
          checkedInAt:
            ceremonyIndex === 3
              ? at(-60 + sessionIndex)
              : sessionIndex === 0
                ? at(-1)
                : new Date().toISOString(),
          source: accepted ? 'invited' : 'walk_in',
          note: 'پذیرش ساختگی توسعه',
        },
        req,
      })
    }
    await verifySeed(payload, req)
    await payload.db.commitTransaction(transactionID)
    return 'created'
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}

export async function readSeed(payload: Payload, req?: PayloadRequest) {
  const options = { depth: 0, pagination: false as const, req }
  const users = (
    await payload.find({
      ...options,
      collection: 'users',
      where: { email: { contains: '@seed.rasad.invalid' } },
      sort: 'username',
    })
  ).docs
  const teachers = (
    await payload.find({
      ...options,
      collection: 'teachers',
      where: { lastName: { contains: surnameTag } },
    })
  ).docs
  const classes = (
    await payload.find({
      ...options,
      collection: 'classes',
      where: { title: { contains: prefix } },
    })
  ).docs
  const students = (
    await payload.find({
      ...options,
      collection: 'students',
      where: { lastName: { contains: surnameTag } },
      sort: 'id',
    })
  ).docs
  const ceremonies = (
    await payload.find({
      ...options,
      collection: 'ceremonies',
      where: { title: { contains: prefix } },
      sort: 'id',
    })
  ).docs
  const sessions = (
    await payload.find({
      ...options,
      collection: 'sessions',
      where: { ceremony: { in: ceremonies.map((c) => c.id) } },
    })
  ).docs
  const invitations = (
    await payload.find({
      ...options,
      collection: 'invitations',
      where: { ceremony: { in: ceremonies.map((c) => c.id) } },
    })
  ).docs
  const checkins = (
    await payload.find({
      ...options,
      collection: 'session-checkins',
      where: { session: { in: sessions.map((s) => s.id) } },
    })
  ).docs
  const followups = (
    await payload.find({
      ...options,
      collection: 'follow-ups',
      where: { student: { in: students.map((s) => s.id) } },
    })
  ).docs
  return {
    users,
    teachers,
    classes,
    students,
    ceremonies,
    sessions,
    invitations,
    checkins,
    followups,
  }
}

/** Strict initial-fixture checks; reruns deliberately preserve later operator changes. */
export async function verifySeed(payload: Payload, req?: PayloadRequest) {
  const data = await readSeed(payload, req)
  const {
    users,
    teachers,
    classes,
    students,
    ceremonies,
    sessions,
    invitations,
    checkins,
    followups,
  } = data
  assert.deepEqual(
    [
      users.length,
      teachers.length,
      classes.length,
      students.length,
      ceremonies.length,
      sessions.length,
      invitations.length,
      checkins.length,
      followups.length,
    ],
    [10, 4, 8, 75, 6, 16, 16, 8, 36],
  )
  for (const status of lifecycles) assert(students.some((s) => s.lifecycleStatus === status))
  for (const status of classStatuses) assert(classes.some((c) => c.status === status))
  for (const status of ceremonyStatuses) assert(ceremonies.some((c) => c.status === status))
  for (const user of users.filter((u) => u.role === 'teacher')) {
    assert(user.teacherProfile)
    assert(teachers.some((t) => t.id === relationID(user.teacherProfile!) && t.status === 'active'))
    const owned = classes.filter(
      (c) => relationID(c.primaryTeacher) === relationID(user.teacherProfile!),
    )
    assert(owned.length)
    assert(
      students.some(
        (s) =>
          s.lifecycleStatus === 'referred_to_teacher' &&
          s.currentClass &&
          owned.some((c) => c.id === relationID(s.currentClass!)),
      ),
    )
  }
  for (const student of students) {
    if (['referred_to_teacher', 'absorbed', 'stabilized'].includes(student.lifecycleStatus))
      assert(student.currentClass && student.referredAt)
    if (student.lifecycleStatus === 'stabilized')
      assert(
        student.absorbedAt &&
          student.stabilizedAt &&
          stabilizationAllowed(student.absorbedAt, new Date(student.stabilizedAt)),
      )
    if (student.lifecycleStatus === 'removed') assert(student.removedReason)
  }
  for (const ceremony of ceremonies)
    assert.equal(
      sessions.filter((s) => relationID(s.ceremony) === ceremony.id && s.status === 'filling')
        .length,
      ['inviting', 'active', 'scheduled'].includes(ceremony.status) ? 1 : 0,
    )
  assert.equal(
    new Set(invitations.map((i) => `${relationID(i.student)}:${relationID(i.ceremony)}`)).size,
    invitations.length,
  )
  for (const invitation of invitations) {
    const processed = sessions.find((s) => s.id === relationID(invitation.processedSession))
    assert(processed && relationID(processed.ceremony) === relationID(invitation.ceremony))
    if (invitation.outcome === 'accepted')
      assert(invitation.assignedSession && relationID(invitation.assignedSession) === processed.id)
    else assert(!invitation.assignedSession)
  }
  for (const status of ['queued', 'sent', 'failed', 'not_required'])
    assert(invitations.some((i) => i.smsStatus === status))
  assert.equal(
    new Set(checkins.map((c) => `${relationID(c.student)}:${relationID(c.session)}`)).size,
    checkins.length,
  )
  const active = ceremonies.find((c) => c.status === 'inviting')!
  assert(
    students.filter(
      (s) =>
        s.lifecycleStatus !== 'removed' &&
        (s.mobile || s.motherMobile || s.fatherMobile) &&
        !invitations.some(
          (i) => relationID(i.ceremony) === active.id && relationID(i.student) === s.id,
        ),
    ).length >= 30,
  )
  return data
}
