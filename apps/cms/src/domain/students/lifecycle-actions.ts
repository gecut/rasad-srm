import type { Payload, PayloadRequest } from 'payload'
import type { User, Student } from '@/payload-types'

import { stabilizationAllowed } from '../shared/lifecycle'
import { authorize } from '../shared/core'

export interface DomainActionResult {
  success: boolean
  student: Student
  message?: string
}

/**
 * Authorize that user is an admin or employee.
 */
function assertStaffAuthorized(user: User, actionName: string) {
  if (!user || !['admin', 'employee', 'follow_up_specialist'].includes(user.role)) {
    throw new Error(`کاربر مجاز به اجرای عملیات '${actionName}' نیست.`)
  }
}

/**
 * Authorize that user is an admin or employee (excluding follow-up specialist).
 */
function assertAdminOrEmployee(user: User, actionName: string) {
  if (!user || !['admin', 'employee'].includes(user.role)) {
    throw new Error(`اجرای عملیات '${actionName}' نیازمند دسترسی کارمند یا مدیر است.`)
  }
}

/**
 * W2: Mark student as class_seeker (خواهان کلاس).
 */
export async function markStudentClassSeeker({
  studentId,
  user,
  payload,
  req,
}: {
  studentId: number
  user: User
  payload: Payload
  req?: PayloadRequest
}): Promise<DomainActionResult> {
  await authorize(payload, user, ['admin', 'employee'], req)
  assertAdminOrEmployee(user, 'markStudentClassSeeker')

  const student = await payload.findByID({
    collection: 'students',
    id: studentId,
    req,
  })

  if (!student) {
    throw new Error(`دانش‌آموز با شناسه ${studentId} یافت نشد.`)
  }

  const updated = await payload.update({
    collection: 'students',
    id: studentId,
    data: {
      lifecycleStatus: 'class_seeker',
    },
    req,
  })

  return {
    success: true,
    student: updated,
    message: 'وضعیت دانش‌آموز با موفقیت به خواهان کلاس تغییر یافت.',
  }
}

/**
 * W3: Refer Student to Class (ارجاع به کلاس).
 * Fully manual class assignment. Sets currentClass, referredAt, and moves lifecycle to referred_to_teacher.
 */
export async function referStudentToClass({
  studentId,
  classId,
  user,
  payload,
  req,
}: {
  studentId: number
  classId: number
  user: User
  payload: Payload
  req?: PayloadRequest
}): Promise<DomainActionResult> {
  await authorize(payload, user, ['admin', 'employee'], req)
  assertAdminOrEmployee(user, 'referStudentToClass')

  const student = await payload.findByID({
    collection: 'students',
    id: studentId,
    req,
  })

  if (!student) {
    throw new Error(`دانش‌آموز با شناسه ${studentId} یافت نشد.`)
  }

  // Authoritative validation of selected class
  const targetClass = await payload.findByID({
    collection: 'classes',
    id: classId,
    req,
  })

  if (!targetClass) {
    throw new Error(`کلاس انتخابی با شناسه ${classId} یافت نشد.`)
  }

  if (targetClass.status === 'cancelled' || targetClass.status === 'ended') {
    throw new Error(`امکان ارجاع به کلاسی با وضعیت '${targetClass.status}' وجود ندارد.`)
  }

  const now = new Date().toISOString()

  const updated = await payload.update({
    collection: 'students',
    id: studentId,
    data: {
      currentClass: classId,
      referredAt: now,
      lifecycleStatus: 'referred_to_teacher',
      removedReason: null,
    },
    req,
  })

  return {
    success: true,
    student: updated,
    message: 'دانش‌آموز با موفقیت به کلاس ارجاع شد و وارد مرحله پیگیری گردید.',
  }
}

/**
 * W5: Confirm First Attendance (تایید اولین حضور در کلاس).
 * Explicit authorized human action. Sets absorbedAt and moves lifecycle to absorbed.
 */
export async function markStudentAbsorbed({
  studentId,
  attendanceDate,
  user,
  payload,
  req,
}: {
  studentId: number
  attendanceDate?: string
  user: User
  payload: Payload
  req?: PayloadRequest
}): Promise<DomainActionResult> {
  await authorize(payload, user, ['admin', 'employee', 'follow_up_specialist'], req)
  assertStaffAuthorized(user, 'markStudentAbsorbed')

  const student = await payload.findByID({
    collection: 'students',
    id: studentId,
    req,
  })

  if (!student) {
    throw new Error(`دانش‌آموز با شناسه ${studentId} یافت نشد.`)
  }

  if (!student.currentClass) {
    throw new Error('برای تایید حضور، دانش‌آموز باید ابتدا به یک کلاس ارجاع شده باشد.')
  }

  const attendanceTimestamp = attendanceDate || new Date().toISOString()

  const updated = await payload.update({
    collection: 'students',
    id: studentId,
    data: {
      absorbedAt: attendanceTimestamp,
      lifecycleStatus: 'absorbed',
    },
    req,
  })

  return {
    success: true,
    student: updated,
    message: 'اولین حضور دانش‌آموز در کلاس تایید شد و وضعیت به جذب شده ارتقا یافت.',
  }
}

/**
 * W6: Confirm Stabilization (تایید تثبیت).
 * Requires:
 * 1. absorbedAt must exist.
 * 2. At least 6 months (180 days) must have elapsed since first attendance.
 * 3. Explicit authorized human action.
 */
export async function confirmStabilization({
  studentId,
  user,
  payload,
  req,
}: {
  studentId: number
  user: User
  payload: Payload
  req?: PayloadRequest
}): Promise<DomainActionResult> {
  await authorize(payload, user, ['admin', 'follow_up_specialist'], req)

  const student = await payload.findByID({
    collection: 'students',
    id: studentId,
    req,
  })

  if (!student) {
    throw new Error(`دانش‌آموز با شناسه ${studentId} یافت نشد.`)
  }

  if (!student.absorbedAt) {
    throw new Error('تثبیت دانش‌آموز بدون ثبت تاریخ اولین حضور امکان‌پذیر نیست.')
  }

  const firstAttendanceTime = new Date(student.absorbedAt).getTime()
  const now = Date.now()

  if (!stabilizationAllowed(student.absorbedAt)) {
    const elapsedDays = Math.floor((now - firstAttendanceTime) / (24 * 60 * 60 * 1000))
    throw new Error(
      `برای تثبیت دانش‌آموز، حداقل ۶ ماه باید از تاریخ اولین حضور گذشته باشد. مدت سپری شده: ${elapsedDays} روز.`,
    )
  }

  const updated = await payload.update({
    collection: 'students',
    id: studentId,
    data: {
      stabilizedAt: new Date().toISOString(),
      lifecycleStatus: 'stabilized',
    },
    req,
  })

  return {
    success: true,
    student: updated,
    message: 'تثبیت دانش‌آموز با موفقیت تایید و ثبت شد.',
  }
}

/**
 * W7: Stop Student Lifecycle (توقف چرخه عمر).
 * Requires non-empty removedReason. Lifecycle -> removed.
 */
export async function removeStudentFromLifecycle({
  studentId,
  removedReason,
  user,
  payload,
  req,
}: {
  studentId: number
  removedReason: string
  user: User
  payload: Payload
  req?: PayloadRequest
}): Promise<DomainActionResult> {
  await authorize(payload, user, ['admin', 'employee', 'follow_up_specialist'], req)
  assertStaffAuthorized(user, 'removeStudentFromLifecycle')

  if (!removedReason || removedReason.trim() === '') {
    throw new Error('برای توقف چرخه عمر دانش‌آموز، ثبت دلیل الزامی است.')
  }

  const student = await payload.findByID({
    collection: 'students',
    id: studentId,
    req,
  })

  if (!student) {
    throw new Error(`دانش‌آموز با شناسه ${studentId} یافت نشد.`)
  }

  const updated = await payload.update({
    collection: 'students',
    id: studentId,
    data: {
      lifecycleStatus: 'removed',
      removedReason: removedReason.trim(),
    },
    req,
  })

  return {
    success: true,
    student: updated,
    message: 'چرخه عمر دانش‌آموز با موفقیت حذف شد.',
  }
}

/**
 * W15: Re-entry / Reset Student Lifecycle (ورود مجدد / بازنشانی).
 * Explicit human-controlled reset of the current lifecycle without long-term case abstractions.
 */
export async function reenterStudentLifecycle({
  studentId,
  resetClass = true,
  targetStatus = 'unknown',
  user,
  payload,
  req,
}: {
  studentId: number
  resetClass?: boolean
  targetStatus?: 'unknown' | 'class_seeker'
  user: User
  payload: Payload
  req?: PayloadRequest
}): Promise<DomainActionResult> {
  await authorize(payload, user, ['admin', 'employee'], req)
  assertAdminOrEmployee(user, 'reenterStudentLifecycle')

  const student = await payload.findByID({
    collection: 'students',
    id: studentId,
    req,
  })

  if (!student) {
    throw new Error(`دانش‌آموز با شناسه ${studentId} یافت نشد.`)
  }

  const updated = await payload.update({
    collection: 'students',
    id: studentId,
    data: {
      lifecycleStatus: targetStatus,
      removedReason: null,
      referredAt: null,
      absorbedAt: null,
      stabilizedAt: null,
      ...(resetClass ? { currentClass: null } : {}),
    },
    req,
  })

  return {
    success: true,
    student: updated,
    message: 'چرخه عمر دانش‌آموز با موفقیت بازنشانی شد و برای ارجاع مجدد آماده است.',
  }
}
