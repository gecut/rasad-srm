import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeValidateHook,
  Payload,
  PayloadRequest,
} from 'payload'
import { relationID } from '../../domain/shared/core'

export const populateCeremonyFromSession: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data || data.ceremony) return data
  const sessionId = data.session ? relationID(data.session) : null
  if (!sessionId) return data

  const session = await req.payload.findByID({
    collection: 'sessions',
    id: sessionId,
    depth: 0,
    req,
  })
  if (session?.ceremony) {
    data.ceremony = relationID(session.ceremony)
  }
  return data
}

export async function syncStudentAttendedCeremonies(
  payload: Payload,
  studentId: number,
  req?: PayloadRequest,
) {
  const checkins = await payload.find({
    collection: 'session-checkins',
    where: { student: { equals: studentId } },
    depth: 0,
    pagination: false,
    select: { ceremony: true },
    overrideAccess: true,
    req,
  })

  const ceremonyIds = Array.from(
    new Set(
      checkins.docs
        .map((c) => (c.ceremony ? relationID(c.ceremony) : null))
        .filter((id): id is number => Boolean(id)),
    ),
  )

  await payload.update({
    collection: 'students',
    id: studentId,
    data: { attendedCeremonies: ceremonyIds },
    overrideAccess: true,
    req,
  })
}

export const syncStudentAttendedCeremoniesAfterChange: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  const studentId = doc?.student ? relationID(doc.student) : null
  if (studentId) {
    await syncStudentAttendedCeremonies(req.payload, studentId, req)
  }
  return doc
}

export const syncStudentAttendedCeremoniesAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  const studentId = doc?.student ? relationID(doc.student) : null
  if (studentId) {
    await syncStudentAttendedCeremonies(req.payload, studentId, req)
  }
  return doc
}
