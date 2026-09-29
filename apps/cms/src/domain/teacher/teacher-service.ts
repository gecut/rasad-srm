import type { Payload, PayloadRequest } from 'payload'
import type { TeacherRoster } from '@rasad/contracts'
import type { User } from '@/payload-types'
import { authorize, DomainError, relationID, transaction, lockTransaction } from '../shared/core'

type Input = { payload: Payload; user: User | null | undefined; req?: PayloadRequest }

async function teacherIdentity({ payload, user, req }: Input) {
  const current = await authorize(payload, user, ['teacher'], req)
  if (!current.teacherProfile) throw new DomainError('حساب شما به مدرس متصل نیست.', 403)
  const teacher = await payload.findByID({
    collection: 'teachers',
    id: relationID(current.teacherProfile),
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (teacher.status !== 'active') throw new DomainError('حساب مدرس غیرفعال است.', 403)
  return { current, teacher }
}

export async function getTeacherRoster(input: Input): Promise<TeacherRoster> {
  const { payload, req } = input
  const { teacher } = await teacherIdentity(input)
  const classes = await payload.find({
    collection: 'classes',
    where: { primaryTeacher: { equals: teacher.id } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (!classes.docs.length) return { classes: [] }
  const students = await payload.find({
    collection: 'students',
    where: { currentClass: { in: classes.docs.map((item) => item.id) } },
    pagination: false,
    sort: 'lastName',
    depth: 0,
    overrideAccess: true,
    req,
  })

  const neighborhoodIds = Array.from(
    new Set(
      students.docs
        .map((s) => (s.neighborhood ? relationID(s.neighborhood) : null))
        .filter((id): id is number => Boolean(id)),
    ),
  )

  const neighborhoods = neighborhoodIds.length
    ? await payload.find({
        collection: 'neighborhoods',
        where: { id: { in: neighborhoodIds } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
    : { docs: [] }
  const neighborhoodMap = new Map(neighborhoods.docs.map((n) => [n.id, n.name]))

  return {
    classes: classes.docs.map((item) => ({
      id: item.id,
      title: item.title,
      students: students.docs
        .filter((student) => student.currentClass && relationID(student.currentClass) === item.id)
        .map((student) => {
          const nId = student.neighborhood ? relationID(student.neighborhood) : null
          const nName = nId ? neighborhoodMap.get(nId) || null : null
          return {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            grade: student.grade,
            mobile: student.mobile,
            fatherMobile: student.fatherMobile,
            motherMobile: student.motherMobile,
            landline: student.landline,
            neighborhood: nId && nName ? { id: nId, name: nName } : null,
            address: student.address,
            referrer: student.referrer,
            notes: student.notes,
            lifecycleStatus: student.lifecycleStatus,
          }
        }),
    })),
  }
}

export async function updateTeacherStudent(
  input: Input & { studentId: number; status: 'absorbed' | 'removed'; reason?: string },
) {
  const { payload, studentId, status, reason } = input
  const { current } = await teacherIdentity(input)
  return transaction(
    payload,
    current,
    `student:${studentId}`,
    async (req) => {
      const { teacher } = await teacherIdentity({ payload, user: current, req })
      const student = await payload.findByID({
        collection: 'students',
        id: studentId,
        depth: 0,
        overrideAccess: true,
        req,
      })
      if (!student.currentClass) throw new DomainError('دانش‌آموز در کلاس شما نیست.', 403)
      await lockTransaction(payload, req, `class:${relationID(student.currentClass)}`)
      const classroom = await payload.findByID({
        collection: 'classes',
        id: relationID(student.currentClass),
        depth: 0,
        overrideAccess: true,
        req,
      })
      if (relationID(classroom.primaryTeacher) !== teacher.id)
        throw new DomainError('دانش‌آموز در کلاس شما نیست.', 403)
      if (!(
        (student.lifecycleStatus === 'referred_to_teacher' &&
          (status === 'absorbed' || status === 'removed')) ||
        (student.lifecycleStatus === 'absorbed' && status === 'removed')
      ))
        throw new DomainError('این تغییر وضعیت مجاز نیست.', 409)
      if (status === 'removed' && !reason?.trim()) throw new DomainError('دلیل حذف را وارد کنید.')
      const updated = await payload.update({
        collection: 'students',
        id: studentId,
        data: {
          lifecycleStatus: status,
          ...(status === 'absorbed'
            ? { absorbedAt: student.absorbedAt || new Date().toISOString() }
            : { removedReason: reason!.trim() }),
        },
        overrideAccess: true,
        req,
      })
      return { id: updated.id, lifecycleStatus: updated.lifecycleStatus }
    },
    input.req,
  )
}
