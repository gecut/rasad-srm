import type { Payload, PayloadRequest } from 'payload'
import type { TeacherRoster } from '@rasad/contracts'
import type { User } from '@/payload-types'
import { authorize, DomainError, relationID, transaction, lockTransaction, normalizePhone } from '../shared/core'

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

  const ceremonyIds = Array.from(
    new Set(
      students.docs
        .flatMap((s) => s.attendedCeremonies || [])
        .map((c) => relationID(c))
        .filter((id): id is number => Boolean(id)),
    ),
  )

  const ceremonies = ceremonyIds.length
    ? await payload.find({
        collection: 'ceremonies',
        where: { id: { in: ceremonyIds } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
    : { docs: [] }
  const ceremonyMap = new Map(ceremonies.docs.map((c) => [c.id, c.title]))

  return {
    classes: classes.docs.map((item) => ({
      id: item.id,
      title: item.title,
      students: students.docs
        .filter((student) => student.currentClass && relationID(student.currentClass) === item.id)
        .map((student) => {
          const nId = student.neighborhood ? relationID(student.neighborhood) : null
          const nName = nId ? neighborhoodMap.get(nId) || null : null
          const attended = (student.attendedCeremonies || [])
            .map((c) => {
              const cId = relationID(c)
              const title = ceremonyMap.get(cId)
              return title ? { id: cId, title } : null
            })
            .filter((c): c is { id: number; title: string } => Boolean(c))

          const studentStatus = student.status
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
            attendedCeremonies: attended,
            status: studentStatus,
            lifecycleStatus: studentStatus,
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

      const currentStatus = student.status
      if (!(
        (currentStatus === 'referred_to_teacher' &&
          (status === 'absorbed' || status === 'removed')) ||
        (currentStatus === 'absorbed' && status === 'removed')
      ))
        throw new DomainError('این تغییر وضعیت مجاز نیست.', 409)
      if (status === 'removed' && !reason?.trim()) throw new DomainError('دلیل حذف را وارد کنید.')
      const updated = await payload.update({
        collection: 'students',
        id: studentId,
        data: {
          status,
          ...(status === 'absorbed'
            ? { absorbedAt: student.absorbedAt || new Date().toISOString() }
            : { removedReason: reason!.trim() }),
        } as any,
        overrideAccess: true,
        req,
      })
      const finalStatus = updated.status
      return { id: updated.id, status: finalStatus, lifecycleStatus: finalStatus }
    },
    input.req,
  )
}

export async function updateTeacherStudentInfo(
  input: Input & {
    studentId: number
    firstName?: string
    lastName?: string
    grade?: number | null
    mobile?: string | null
    fatherMobile?: string | null
    motherMobile?: string | null
    landline?: string | null
    neighborhoodId?: number | null
    address?: string | null
    referrer?: string | null
    notes?: string | null
  },
) {
  const { payload, studentId } = input
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

      const updateData: Record<string, unknown> = {}
      if (input.firstName !== undefined) updateData.firstName = input.firstName.trim()
      if (input.lastName !== undefined) updateData.lastName = input.lastName.trim()
      if (input.grade !== undefined) updateData.grade = input.grade
      if (input.mobile !== undefined)
        updateData.mobile = input.mobile?.trim() ? normalizePhone(input.mobile) : null
      if (input.fatherMobile !== undefined)
        updateData.fatherMobile = input.fatherMobile?.trim()
          ? normalizePhone(input.fatherMobile)
          : null
      if (input.motherMobile !== undefined)
        updateData.motherMobile = input.motherMobile?.trim()
          ? normalizePhone(input.motherMobile)
          : null
      if (input.landline !== undefined) updateData.landline = input.landline?.trim() || null
      if (input.neighborhoodId !== undefined) updateData.neighborhood = input.neighborhoodId
      if (input.address !== undefined) updateData.address = input.address?.trim() || null
      if (input.referrer !== undefined) updateData.referrer = input.referrer?.trim() || null
      if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null

      const updated = await payload.update({
        collection: 'students',
        id: studentId,
        data: updateData as any,
        overrideAccess: true,
        req,
      })
      return { id: updated.id }
    },
    input.req,
  )
}
