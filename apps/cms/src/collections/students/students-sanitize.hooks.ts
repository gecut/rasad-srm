import type { Student } from '@/payload-types'
import { normalizePhone } from '../../domain/shared/core'

const TEXT_FIELDS_TO_SANITIZE: (keyof Student)[] = [
  'firstName',
  'lastName',
  'address',
  'referrer',
  'notes',
]

const PHONE_FIELDS_TO_SANITIZE: (keyof Student)[] = ['mobile', 'motherMobile', 'fatherMobile']

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
