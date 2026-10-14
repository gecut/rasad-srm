import { APIError, type PayloadRequest } from 'payload'
import type { Student } from '@/payload-types'
import { stabilizationAllowed } from '../../domain/shared/lifecycle'

interface ApplyStudentTransitionsParams {
  data: Partial<Student>
  originalDoc?: Student
  req?: PayloadRequest
}

/**
 * Applies intelligent lifecycle state transitions, synchronizes timestamps,
 * protects advanced states (absorbed, stabilized), and enforces business invariants.
 */
export function applyStudentLifecycleTransitions({
  data,
  originalDoc,
  req,
}: ApplyStudentTransitionsParams): void {
  if (!data) return

  const originalStatus = (originalDoc as any)?.status || 'unknown'
  const isStatusExplicitlyChanged = Boolean(
    (data as any).status && (data as any).status !== originalStatus,
  )
  const merged: any = { ...originalDoc, ...data }

  // 1. Handling currentClass unassignment (cleared to null/empty)
  if (data.currentClass === null || data.currentClass === ('' as unknown)) {
    // If the student was referred to a teacher and class is removed without explicit new status:
    // Revert based on grade: 1-3 -> waitlisted, 4-6 -> class_seeker, null -> unknown
    if (originalStatus === 'referred_to_teacher' && !isStatusExplicitlyChanged) {
      const grade = merged.grade
      if (grade && grade <= 3) {
        ;(data as any).status = 'waitlisted'
      } else if (grade && grade >= 4) {
        ;(data as any).status = 'class_seeker'
      } else {
        ;(data as any).status = 'unknown'
      }
      data.referredAt = null
      merged.status = (data as any).status
      merged.referredAt = null
    }
  }

  // 2. Intelligent Auto-Transition on Class Assignment
  // When a student in pre-class states (unknown, waitlisted, class_seeker) is assigned a class:
  const isPreClass = ['unknown', 'waitlisted', 'class_seeker'].includes(originalStatus)
  const isAssigningClass = Boolean(data.currentClass)

  if (isAssigningClass && isPreClass && !isStatusExplicitlyChanged) {
    ;(data as any).status = 'referred_to_teacher'
    data.referredAt = data.referredAt || new Date().toISOString()
    data.removedReason = null
    merged.status = 'referred_to_teacher'
    merged.referredAt = data.referredAt
    merged.removedReason = null
  }

  // 3. Auto-promote to 'absorbed' if absorbedAt is set/provided
  if (
    data.absorbedAt &&
    merged.status === 'referred_to_teacher' &&
    !(data as any).status
  ) {
    ;(data as any).status = 'absorbed'
    merged.status = 'absorbed'
  }

  // 4. Timestamp synchronization for referred_to_teacher
  if (merged.status === 'referred_to_teacher') {
    if (!merged.currentClass) {
      throw new APIError('ابتدا کلاس دانش‌آموز را انتخاب کنید.', 422)
    }
    if (!merged.referredAt) {
      data.referredAt = new Date().toISOString()
      merged.referredAt = data.referredAt
    }
  }

  // 5. Invariant and timestamp for absorbed
  if (merged.status === 'absorbed') {
    if (!merged.currentClass) {
      throw new APIError('دانش‌آموز جذب‌شده باید دارای کلاس باشد.', 422)
    }
    if (!merged.absorbedAt) {
      data.absorbedAt = new Date().toISOString()
      merged.absorbedAt = data.absorbedAt
    }
  }

  // 6. Cleanup removedReason when reactivating away from removed
  if (
    originalStatus === 'removed' &&
    (data as any).status &&
    (data as any).status !== 'removed'
  ) {
    data.removedReason = null
    merged.removedReason = null
  }

  // 7. Invariant for removed status (reason required)
  if (merged.status === 'removed') {
    if (
      !merged.removedReason ||
      (typeof merged.removedReason === 'string' && merged.removedReason.trim() === '')
    ) {
      throw new Error('برای دانش‌آموز حذف‌شده، ثبت دلیل حذف الزامی است.')
    }
  }

  // 8. Invariant: stabilized status requires absorbedAt and >= 6 months elapsed
  // Only enforced when status is actively being set to 'stabilized'
  if ((data as any).status === 'stabilized') {
    if (req?.user && req.user.role !== 'admin') {
      throw new APIError('اجازه تأیید تثبیت را ندارید.', 403)
    }
    if (!merged.absorbedAt) {
      throw new Error('تثبیت دانش‌آموز بدون ثبت تاریخ اولین حضور در کلاس امکان‌پذیر نیست.')
    }

    if (!stabilizationAllowed(merged.absorbedAt)) {
      throw new Error('برای تثبیت دانش‌آموز، حداقل ۶ ماه باید از تاریخ اولین حضور گذشته باشد.')
    }

    if (!data.stabilizedAt) {
      data.stabilizedAt = new Date().toISOString()
    }
  }
}
