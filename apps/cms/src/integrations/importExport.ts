import path from 'path'
import { fileURLToPath } from 'url'
import { importExportPlugin } from '@payloadcms/plugin-import-export'
import type { Plugin } from 'payload'
import { isAdmin, isEmployeeOrAdmin } from '../access/roles'
import { normalizePhone } from '../domain/shared/core'
import { jalaliInstant } from '../lib/jalali'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const JALALI_DATE_PATTERN = /^(?:13|14|۱۳|۱۴)\d{2}[/-]\d{1,2}[/-]\d{1,2}$/

export function normalizeStudentRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...row }

  // 1. Enforce origin: 'import'
  result.origin = 'import'

  // 2. Persian letter normalization
  for (const key of ['firstName', 'lastName', 'address', 'referrer', 'notes'] as const) {
    if (typeof result[key] === 'string') {
      result[key] = (result[key] as string)
        .normalize('NFKC')
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        .trim()
        .replace(/\s+/g, ' ')
    }
  }

  // 3. Normalize phones if provided
  for (const key of ['mobile', 'motherMobile', 'fatherMobile'] as const) {
    const val = result[key]
    if (typeof val === 'string' && val.trim() !== '') {
      try {
        result[key] = normalizePhone(val)
      } catch {
        // Keep raw value so collection beforeValidate can report a descriptive error
      }
    }
  }

  // 4. Normalize landline if provided
  if (typeof result.landline === 'string') {
    const cleaned = result.landline
      .normalize('NFKC')
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .trim()
    result.landline = cleaned !== '' ? cleaned : null
  }

  // 5. Normalize grade if provided as string or Persian numeral
  if (result.grade !== undefined && result.grade !== null) {
    if (typeof result.grade === 'string') {
      const latin = (result.grade as string)
        .normalize('NFKC')
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .trim()
      const parsed = parseInt(latin, 10)
      result.grade = Number.isInteger(parsed) ? parsed : result.grade
    }
  }

  // 4. Convert Jalali dates if provided
  for (const key of ['referredAt', 'absorbedAt', 'stabilizedAt'] as const) {
    const val = result[key]
    if (typeof val === 'string' && JALALI_DATE_PATTERN.test(val.trim())) {
      try {
        result[key] = jalaliInstant(val.trim(), '12:00')
      } catch {
        // Keep raw value if parsing fails
      }
    }
  }

  return result
}

export function normalizeTeacherRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...row }

  if (typeof result.firstName === 'string') {
    result.firstName = result.firstName
      .normalize('NFKC')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .trim()
  }

  if (typeof result.lastName === 'string') {
    result.lastName = result.lastName.normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim()
  }

  if (typeof result.mobile === 'string' && result.mobile.trim() !== '') {
    try {
      result.mobile = normalizePhone(result.mobile)
    } catch {
      // keep raw value so validation reports descriptive error
    }
  }

  if (
    !result.status ||
    typeof result.status !== 'string' ||
    !['active', 'inactive'].includes(result.status)
  ) {
    result.status = 'active'
  }

  return result
}

export function normalizeClassRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...row }

  if (typeof result.title === 'string') {
    result.title = result.title.normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim()
  }

  if (result.capacity !== undefined && result.capacity !== null) {
    if (typeof result.capacity === 'string') {
      const latin = (result.capacity as string)
        .normalize('NFKC')
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .trim()
      const parsed = parseInt(latin, 10)
      result.capacity = Number.isInteger(parsed) ? parsed : result.capacity
    }
  }

  if (!result.status || typeof result.status !== 'string') {
    result.status = 'planned'
  }

  return result
}

export function normalizeNeighborhoodRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...row }

  if (typeof result.name === 'string') {
    result.name = result.name.normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim()
  }

  if (typeof result.description === 'string') {
    result.description = (result.description as string)
      .normalize('NFKC')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .trim()
  }

  if (typeof result.subDistricts === 'string') {
    const list = (result.subDistricts as string)
      .split(/[,،\n]/)
      .map((s) => s.normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim())
      .filter(Boolean)
    result.subDistricts = list.map((name) => ({ name }))
  }

  return result
}

export const configuredImportExportPlugin: Plugin = importExportPlugin({
  overrideExportCollection: ({ collection }) => {
    return {
      ...collection,
      labels: {
        singular: 'خروجی داده',
        plural: 'خروجی‌های داده',
      },
      admin: {
        ...collection.admin,
        group: 'مدیریت داده',
      },
      access: {
        read: isEmployeeOrAdmin,
        create: isEmployeeOrAdmin,
        update: () => false,
        delete: isAdmin,
      },
      upload: {
        ...(typeof collection.upload === 'object' ? collection.upload : {}),
        staticDir: path.resolve(dirname, '../../media/exports'),
      },
    }
  },
  overrideImportCollection: ({ collection }) => {
    return {
      ...collection,
      labels: {
        singular: 'ورودی داده',
        plural: 'ورودی‌های داده',
      },
      admin: {
        ...collection.admin,
        group: 'مدیریت داده',
      },
      access: {
        read: isAdmin,
        create: isAdmin,
        update: () => false,
        delete: isAdmin,
      },
      upload: {
        ...(typeof collection.upload === 'object' ? collection.upload : {}),
        staticDir: path.resolve(dirname, '../../media/imports'),
      },
    }
  },
  collections: [
    {
      slug: 'students',
      export: {
        disableJobsQueue: true,
        disableSave: true,
      },
      import: {
        disableJobsQueue: true,
        hooks: {
          before: ({ data }) => {
            return data.map((row) =>
              normalizeStudentRow(row as Record<string, unknown>),
            ) as typeof data
          },
        },
      },
    },
    // Operational collections with import/export support
    {
      slug: 'classes',
      export: { disableJobsQueue: true, disableSave: true },
      import: {
        disableJobsQueue: true,
        hooks: {
          before: ({ data }) => {
            return data.map((row) =>
              normalizeClassRow(row as Record<string, unknown>),
            ) as typeof data
          },
        },
      },
    },
    {
      slug: 'teachers',
      export: { disableJobsQueue: true, disableSave: true },
      import: {
        disableJobsQueue: true,
        hooks: {
          before: ({ data }) => {
            return data.map((row) =>
              normalizeTeacherRow(row as Record<string, unknown>),
            ) as typeof data
          },
        },
      },
    },
    {
      slug: 'neighborhoods',
      export: { disableJobsQueue: true, disableSave: true },
      import: {
        disableJobsQueue: true,
        hooks: {
          before: ({ data }) => {
            return data.map((row) =>
              normalizeNeighborhoodRow(row as Record<string, unknown>),
            ) as typeof data
          },
        },
      },
    },
    {
      slug: 'ceremonies',
      export: { disableJobsQueue: true, disableSave: true },
      import: false,
    },
    {
      slug: 'sessions',
      export: { disableJobsQueue: true, disableSave: true },
      import: false,
    },
    {
      slug: 'invitations',
      export: { disableJobsQueue: true, disableSave: true },
      import: false,
    },
    {
      slug: 'session-checkins',
      export: { disableJobsQueue: true, disableSave: true },
      import: false,
    },
    {
      slug: 'follow-ups',
      export: { disableJobsQueue: true, disableSave: true },
      import: false,
    },
    // Sensitive / internal collections: completely disabled
    {
      slug: 'users',
      export: false,
      import: false,
    },
    {
      slug: 'invitation-claims',
      export: false,
      import: false,
    },
  ],
})
