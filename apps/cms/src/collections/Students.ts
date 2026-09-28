import { lockTransaction } from '../domain/shared/core'
import { APIError, type CollectionConfig } from 'payload'
import { normalizePhone } from '../domain/shared/core'
import { isEmployeeOrAdmin, isStaff } from '../access/roles'
import { stabilizationAllowed } from '../domain/shared/lifecycle'

export const Students: CollectionConfig = {
  slug: 'students',
  labels: {
    singular: 'دانش‌آموز',
    plural: 'دانش‌آموزان',
  },
  admin: {
    group: 'افراد',
    useAsTitle: 'lastName',
    defaultColumns: [
      'lastName',
      'firstName',
      'grade',
      'neighborhood',
      'lifecycleStatus',
      'readinessStatus',
      'currentClass',
      'updatedAt',
    ],
    listSearchableFields: [
      'firstName',
      'lastName',
      'mobile',
      'fatherMobile',
      'motherMobile',
      'landline',
      'referrer',
    ],
  },
  access: {
    read: isStaff,
    create: isEmployeeOrAdmin,
    update: isStaff,
    delete: isEmployeeOrAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const tx = await req.transactionID
        if (originalDoc?.id && tx)
          await lockTransaction(req.payload, req, `student:${originalDoc.id}`)
        return data
      },
    ],
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (!data) return data
        for (const key of ['firstName', 'lastName', 'address', 'referrer', 'notes'])
          if (typeof data[key] === 'string')
            data[key] = data[key]
              .normalize('NFKC')
              .replace(/ي/g, 'ی')
              .replace(/ك/g, 'ک')
              .trim()
              .replace(/\s+/g, ' ')

        for (const key of ['mobile', 'motherMobile', 'fatherMobile']) {
          if (data[key]) data[key] = normalizePhone(data[key])
        }

        if (typeof data.landline === 'string') {
          const cleaned = data.landline
            .normalize('NFKC')
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .trim()
          data.landline = cleaned !== '' ? cleaned : null
        }
        const merged = { ...originalDoc, ...data }
        if (merged.lifecycleStatus === 'referred_to_teacher' && !merged.currentClass)
          throw new APIError('ابتدا کلاس دانش‌آموز را انتخاب کنید.', 422)
        if (merged.lifecycleStatus === 'referred_to_teacher' && !merged.referredAt)
          data.referredAt = new Date().toISOString()
        if (merged.lifecycleStatus === 'absorbed' && !merged.currentClass)
          throw new APIError('دانش‌آموز باید به کلاس معرفی شده باشد.', 422)
        if (merged.lifecycleStatus === 'absorbed' && !merged.absorbedAt)
          data.absorbedAt = new Date().toISOString()
        // Removal requires a reason.
        if (merged.lifecycleStatus === 'removed') {
          if (
            !merged.removedReason ||
            (typeof merged.removedReason === 'string' && merged.removedReason.trim() === '')
          ) {
            throw new Error('برای دانش‌آموز حذف‌شده، ثبت دلیل حذف الزامی است.')
          }
        }

        // Invariant: stabilized status requires absorbedAt and >= 6 months elapsed
        if (data.lifecycleStatus === 'stabilized') {
          if (req.user && !['admin', 'follow_up_specialist'].includes(req.user.role))
            throw new APIError('اجازه تأیید تثبیت را ندارید.', 403)
          if (!merged.absorbedAt) {
            throw new Error('تثبیت دانش‌آموز بدون ثبت تاریخ اولین حضور در کلاس امکان‌پذیر نیست.')
          }

          if (!stabilizationAllowed(merged.absorbedAt)) {
            throw new Error(
              'برای تثبیت دانش‌آموز، حداقل ۶ ماه باید از تاریخ اولین حضور گذشته باشد.',
            )
          }

          if (!data.stabilizedAt) {
            data.stabilizedAt = new Date().toISOString()
          }
        }

        return data
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'مشخصات فردی و ارتباطی',
          description: 'اطلاعات هویتی، شماره‌های تماس، نشانی و سوابق حضور در مراسم‌ها',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'firstName',
                  label: 'نام',
                  type: 'text',
                  required: true,
                  admin: { width: '33%' },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
                {
                  name: 'lastName',
                  label: 'نام خانوادگی',
                  type: 'text',
                  required: true,
                  admin: { width: '33%' },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
                {
                  name: 'origin',
                  label: 'منبع ثبت',
                  type: 'select',
                  required: true,
                  defaultValue: 'admin',
                  admin: { width: '34%' },
                  options: [
                    { label: 'مدیریت', value: 'admin' },
                    { label: 'پذیرش حضوری', value: 'reception_walk_in' },
                    { label: 'ورود داده', value: 'import' },
                  ],
                  access: { update: ({ req }) => req.user?.role === 'admin' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'mobile',
                  label: 'شماره همراه دانش‌آموز',
                  type: 'text',
                  admin: { width: '33%' },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
                {
                  name: 'fatherMobile',
                  label: 'شماره همراه پدر',
                  type: 'text',
                  admin: { width: '33%' },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
                {
                  name: 'motherMobile',
                  label: 'شماره همراه مادر',
                  type: 'text',
                  admin: { width: '34%' },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'landline',
                  label: 'تلفن ثابت منزل',
                  type: 'text',
                  admin: { width: '33%' },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
                {
                  name: 'grade',
                  label: 'پایه تحصیلی',
                  type: 'number',
                  index: true,
                  min: 1,
                  max: 6,
                  admin: {
                    width: '33%',
                    description: 'پایه تحصیلی فعلی در مدرسه (۱ تا ۶)',
                  },
                  validate: (val: unknown) => {
                    if (val == null) return true
                    if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 6) {
                      return 'پایه تحصیلی باید عدد صحیح بین ۱ تا ۶ باشد.'
                    }
                    return true
                  },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
                {
                  name: 'neighborhood',
                  label: 'محدوده منزل',
                  type: 'relationship',
                  relationTo: 'neighborhoods',
                  hasMany: false,
                  index: true,
                  admin: { width: '34%' },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'referrer',
                  label: 'نام معرف',
                  type: 'text',
                  admin: { width: '33%' },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
                {
                  name: 'address',
                  label: 'نشانی دقیق منزل',
                  type: 'textarea',
                  admin: { width: '67%' },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
              ],
            },
            {
              name: 'notes',
              label: 'یادداشت‌های پرونده',
              type: 'textarea',
              admin: {
                description: 'توضیحات تکمیلی و نکات مهم درباره وضعیت دانش‌آموز',
              },
            },
            {
              name: 'checkins',
              label: 'سوابق پذیرش در مراسم‌ها',
              type: 'join',
              collection: 'session-checkins',
              on: 'student',
              admin: {
                allowCreate: false,
                description:
                  'لیست تمام مراسم‌ها و سانس‌هایی که دانش‌آموز در آن‌ها پذیرش شده است (منبع واحد حقیقت).',
                defaultColumns: ['session', 'source', 'checkedInAt', 'checkedInBy'],
              },
            },
          ],
        },
        {
          label: 'حلقه حیات و کلاس',
          description: 'وضعیت پذیرش، کلاس فعلی، مراحل چرخه عمر دانش‌آموز و سوابق دعوت‌ها',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'readinessStatus',
                  label: 'وضعیت پذیرش/آمادگی',
                  type: 'select',
                  required: true,
                  defaultValue: 'normal',
                  index: true,
                  admin: {
                    width: '50%',
                    description: 'پشت‌خطی بعدی مستقل از چرخه عمر است.',
                  },
                  options: [
                    { label: 'عادی (Normal)', value: 'normal' },
                    { label: 'پشت‌خطی (Waitlisted)', value: 'waitlisted' },
                  ],
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
                {
                  name: 'currentClass',
                  label: 'کلاس فعلی',
                  type: 'relationship',
                  relationTo: 'classes',
                  hasMany: false,
                  index: true,
                  admin: {
                    width: '50%',
                    description: 'هر دانش‌آموز حداکثر در یک کلاس عضویت دارد.',
                  },
                  access: {
                    update: ({ req }) =>
                      Boolean(req.user?.role === 'admin' || req.user?.role === 'employee'),
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'lifecycleStatus',
                  label: 'وضعیت چرخه عمر',
                  type: 'select',
                  required: true,
                  defaultValue: 'unknown',
                  index: true,
                  admin: { width: '50%' },
                  options: [
                    { label: 'نامعلوم (Unknown)', value: 'unknown' },
                    { label: 'خواهان کلاس', value: 'class_seeker' },
                    { label: 'به مدرس معرفی شده', value: 'referred_to_teacher' },
                    { label: 'جذب شده', value: 'absorbed' },
                    { label: 'تثبیت‌شده (Stabilized)', value: 'stabilized' },
                    { label: 'حذف شده', value: 'removed' },
                  ],
                },
                {
                  name: 'removedReason',
                  label: 'دلیل حذف از چرخه',
                  type: 'text',
                  admin: {
                    width: '50%',
                    description: 'در صورت انتخاب وضعیت حذف‌شده، ذکر دلیل الزامی است.',
                    condition: (data) => data?.lifecycleStatus === 'removed',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'referredAt',
                  label: 'تاریخ ارجاع به کلاس',
                  type: 'date',
                  admin: {
                    width: '33%',
                    readOnly: true,
                    description: 'توسط سیستم هنگام ارجاع به کلاس تنظیم می‌شود.',
                  },
                },
                {
                  name: 'absorbedAt',
                  label: 'تاریخ اولین حضور',
                  type: 'date',
                  admin: {
                    width: '33%',
                    description: 'تاریخ تایید حضور واقعی در کلاس توسط کارشناس پیگیری.',
                  },
                },
                {
                  name: 'stabilizedAt',
                  label: 'تاریخ تثبیت',
                  type: 'date',
                  admin: {
                    width: '34%',
                    readOnly: true,
                    description: 'توسط سیستم پس از تایید تثبیت ثبت می‌شود.',
                  },
                },
              ],
            },
            {
              name: 'invitations',
              label: 'سوابق دعوت به مراسم‌ها',
              type: 'join',
              collection: 'invitations',
              on: 'student',
              admin: {
                allowCreate: false,
                description: 'تاریخچه تماس‌های اپراتورهای دعوت و نتیجه هر تماس.',
                defaultColumns: ['ceremony', 'assignedSession', 'outcome', 'processedAt'],
              },
            },
          ],
        },
      ],
    },
  ],
}
