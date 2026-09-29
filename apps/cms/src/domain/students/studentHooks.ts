import { APIError, type PayloadRequest } from 'payload'
import type { Student } from '@/payload-types'
import { normalizePhone } from '../shared/core'
import { stabilizationAllowed } from '../shared/lifecycle'

const TEXT_FIELDS_TO_SANITIZE: (keyof Student)[] = [
  'firstName',
  'lastName',
  'address',
  'referrer',
  'notes',
]

const PHONE_FIELDS_TO_SANITIZE: (keyof Student)[] = [
  'mobile',
  'motherMobile',
  'fatherMobile',
]

/**
 * Sanitizes Persian text fields, phone numbers, and landline in Student payload data.
 */
export function sanitizeStudentInput(data: Partial<Student>): void {
  if (!data) return

  for (const key of TEXT_FIELDS_TO_SANITIZE) {
    const val = data[key]
    if (typeof val === 'string') {
      ;(data as Record<string, unknown>)[key] = val
        .normalize('NFKC')
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        .trim()
        .replace(/\s+/g, ' ')
    }
  }

  for (const key of PHONE_FIELDS_TO_SANITIZE) {
    const val = data[key]
    if (typeof val === 'string' && val.trim() !== '') {
      ;(data as Record<string, unknown>)[key] = normalizePhone(val)
    }
  }

  if (typeof data.landline === 'string') {
    const cleaned = data.landline
      .normalize('NFKC')
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .trim()
    data.landline = cleaned !== '' ? cleaned : null
  }
}

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

  const originalStatus = originalDoc?.lifecycleStatus || 'unknown'
  const isStatusExplicitlyChanged = Boolean(
    data.lifecycleStatus && data.lifecycleStatus !== originalStatus,
  )
  const merged: Partial<Student> = { ...originalDoc, ...data }

  // 1. Handling currentClass unassignment (cleared to null/empty)
  if (data.currentClass === null || data.currentClass === ('' as unknown)) {
    // If the student was referred to a teacher and class is removed without explicit new status,
    // gracefully transition back to class_seeker (per STATUS_MODEL.md: wants a class, but no active referral).
    if (originalStatus === 'referred_to_teacher' && !isStatusExplicitlyChanged) {
      data.lifecycleStatus = 'class_seeker'
      data.referredAt = null
      merged.lifecycleStatus = 'class_seeker'
      merged.referredAt = null
    }
  }

  // 2. Intelligent Auto-Transition on Class Assignment
  // When a student in pre-class states (unknown or class_seeker) is assigned a class:
  const isPreClass = originalStatus === 'unknown' || originalStatus === 'class_seeker'
  const isAssigningClass = Boolean(data.currentClass)

  if (isAssigningClass && isPreClass && !isStatusExplicitlyChanged) {
    data.lifecycleStatus = 'referred_to_teacher'
    data.referredAt = data.referredAt || new Date().toISOString()
    data.removedReason = null
    merged.lifecycleStatus = 'referred_to_teacher'
    merged.referredAt = data.referredAt
    merged.removedReason = null
  }

  // 3. Auto-promote to 'absorbed' if absorbedAt is set/provided
  if (data.absorbedAt && merged.lifecycleStatus === 'referred_to_teacher' && !data.lifecycleStatus) {
    data.lifecycleStatus = 'absorbed'
    merged.lifecycleStatus = 'absorbed'
  }

  // 4. Timestamp synchronization for referred_to_teacher
  if (merged.lifecycleStatus === 'referred_to_teacher') {
    if (!merged.currentClass) {
      throw new APIError('ابتدا کلاس دانش‌آموز را انتخاب کنید.', 422)
    }
    if (!merged.referredAt) {
      data.referredAt = new Date().toISOString()
      merged.referredAt = data.referredAt
    }
  }

  // 5. Invariant and timestamp for absorbed
  if (merged.lifecycleStatus === 'absorbed') {
    if (!merged.currentClass) {
      throw new APIError('دانش‌آموز جذب‌شده باید دارای کلاس باشد.', 422)
    }
    if (!merged.absorbedAt) {
      data.absorbedAt = new Date().toISOString()
      merged.absorbedAt = data.absorbedAt
    }
  }

  // 6. Cleanup removedReason when reactivating away from removed
  if (originalStatus === 'removed' && merged.lifecycleStatus && merged.lifecycleStatus !== 'removed') {
    data.removedReason = null
    merged.removedReason = null
  }

  // 7. Invariant for removed status (reason required)
  if (merged.lifecycleStatus === 'removed') {
    if (
      !merged.removedReason ||
      (typeof merged.removedReason === 'string' && merged.removedReason.trim() === '')
    ) {
      throw new Error('برای دانش‌آموز حذف‌شده، ثبت دلیل حذف الزامی است.')
    }
  }

  // 8. Invariant: stabilized status requires absorbedAt and >= 6 months elapsed
  // Only enforced when lifecycleStatus is actively being set to 'stabilized'
  if (data.lifecycleStatus === 'stabilized') {
    if (req?.user && !['admin', 'follow_up_specialist'].includes(req.user.role)) {
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
