import type { CollectionConfig } from 'payload'
import {
  isAdmin,
  isAdminField,
  isStaff,
} from '../../access/roles'
import { lockTransaction } from '../../domain/shared/core'
import { applyStudentLifecycleTransitions } from './students-lifecycle.hooks'
import { sanitizeStudentInput } from './students-sanitize.hooks'

export const Students: CollectionConfig = {
  slug: 'students',
  labels: {
    singular: 'دانش‌آموز',
    plural: 'دانش‌آموزان',
  },
  admin: {
    group: 'مدیریت دانش‌آموزان و آموزش',
    useAsTitle: 'lastName',
    defaultColumns: [
      'lastName',
      'firstName',
      'grade',
      'neighborhood',
      'status',
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
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
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
        sanitizeStudentInput(data)
        applyStudentLifecycleTransitions({ data, originalDoc, req })
        return data
      },
    ],
  },
  fields: [
    {
      name: 'fullName',
      label: 'نام و نام خانوادگی',
      type: 'text',
      virtual: true,
      admin: {
        hidden: true,
      },
      hooks: {
        afterRead: [
          ({ data }) => {
            return [data?.firstName, data?.lastName].filter(Boolean).join(' ')
          },
        ],
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'مشخصات فردی و ارتباطی',
          description: 'اطلاعات هویتی، شماره‌های تماس، نشانی و سوابق حضور در مراسم‌ها',
          fields: [
            {
              type: 'collapsible',
              label: 'مشخصات هویتی و تحصیلی',
              admin: {
                initCollapsed: false,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'firstName',
                      label: 'نام',
                      type: 'text',
                      required: true,
                      admin: { width: '50%' },
                      access: {
                        update: isAdminField,
                      },
                    },
                    {
                      name: 'lastName',
                      label: 'نام خانوادگی',
                      type: 'text',
                      required: true,
                      admin: { width: '50%' },
                      access: {
                        update: isAdminField,
                      },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'grade',
                      label: 'پایه تحصیلی',
                      type: 'number',
                      index: true,
                      min: 1,
                      max: 6,
                      admin: {
                        width: '50%',
                        description: 'پایه تحصیلی فعلی در مدرسه (۱ تا ۶)',
                      },
                      validate: (val: unknown) => {
                        if (val == null) return true
                        if (
                          typeof val !== 'number' ||
                          !Number.isInteger(val) ||
                          val < 1 ||
                          val > 6
                        ) {
                          return 'پایه تحصیلی باید عدد صحیح بین ۱ تا ۶ باشد.'
                        }
                        return true
                      },
                      access: {
                        update: isAdminField,
                      },
                    },
                    {
                      name: 'origin',
                      label: 'منبع ثبت',
                      type: 'select',
                      required: true,
                      defaultValue: 'admin',
                      admin: { width: '50%' },
                      options: [
                        { label: 'مدیریت', value: 'admin' },
                        { label: 'پذیرش حضوری', value: 'reception_walk_in' },
                        { label: 'ورود داده', value: 'import' },
                      ],
                      access: { update: isAdminField },
                    },
                  ],
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'شماره‌های تماس و ارتباط با خانواده',
              admin: {
                initCollapsed: false,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'mobile',
                      label: 'شماره همراه دانش‌آموز',
                      type: 'text',
                      admin: { width: '50%' },
                      access: {
                        update: isAdminField,
                      },
                    },
                    {
                      name: 'landline',
                      label: 'تلفن ثابت منزل',
                      type: 'text',
                      admin: { width: '50%' },
                      access: {
                        update: isAdminField,
                      },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'fatherMobile',
                      label: 'شماره همراه پدر',
                      type: 'text',
                      admin: { width: '50%' },
                      access: {
                        update: isAdminField,
                      },
                    },
                    {
                      name: 'motherMobile',
                      label: 'شماره همراه مادر',
                      type: 'text',
                      admin: { width: '50%' },
                      access: {
                        update: isAdminField,
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'محدوده سکونت، نشانی و معرف',
              admin: {
                initCollapsed: false,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'neighborhood',
                      label: 'ناحیه شهری',
                      type: 'relationship',
                      relationTo: 'neighborhoods',
                      hasMany: false,
                      index: true,
                      admin: { width: '50%', description: 'ناحیه شهری محل سکونت دانش‌آموز' },
                      access: {
                        update: isAdminField,
                      },
                    },
                    {
                      name: 'referrer',
                      label: 'نام معرف',
                      type: 'text',
                      admin: { width: '50%' },
                      access: {
                        update: isAdminField,
                      },
                    },
                  ],
                },
                {
                  name: 'address',
                  label: 'نشانی دقیق منزل',
                  type: 'textarea',
                  access: {
                    update: isAdminField,
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'یادداشت‌ها و ملاحظات پرونده',
              admin: {
                initCollapsed: false,
              },
              fields: [
                {
                  name: 'notes',
                  label: 'یادداشت‌های پرونده',
                  type: 'textarea',
                  admin: {
                    description: 'توضیحات تکمیلی و نکات مهم درباره وضعیت دانش‌آموز',
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'مراسم‌های حضور یافته',
              admin: {
                hidden: true,
              },
              fields: [
                {
                  name: 'attendedCeremonies',
                  label: 'مراسم‌های حضور یافته',
                  type: 'relationship',
                  relationTo: 'ceremonies',
                  hasMany: true,
                  admin: {
                    hidden: true,
                    readOnly: true,
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'سوابق حضور در مراسم‌ها',
              admin: {
                initCollapsed: false,
                description:
                  'لیست تمام مراسم‌ها و سانس‌هایی که دانش‌آموز در آن‌ها پذیرش قطعی شده است (منبع واحد حقیقت).',
              },
              fields: [
                {
                  name: 'checkins',
                  label: 'ریز سوابق حضور در مراسم‌ها',
                  type: 'join',
                  collection: 'session-checkins',
                  on: 'student',
                  admin: {
                    allowCreate: false,
                    defaultColumns: ['ceremony', 'session', 'source', 'checkedInAt', 'checkedInBy'],
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'حلقه حیات و کلاس',
          description: 'وضعیت پذیرش، کلاس فعلی و مراحل چرخه عمر دانش‌آموز',
          fields: [
            {
              type: 'collapsible',
              label: 'وضعیت و انتساب کلاس دانش‌آموز',
              admin: {
                initCollapsed: false,
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'status',
                      label: 'وضعیت دانش‌آموز',
                      type: 'select',
                      required: true,
                      defaultValue: 'unknown',
                      index: true,
                      admin: {
                        width: '50%',
                        description: 'وضعیت چرخه حیات و آمادگی دانش‌آموز در سامانه',
                      },
                      access: {
                        update: isAdminField,
                      },
                      options: [
                        { label: 'نامعلوم (Unknown)', value: 'unknown' },
                        { label: 'پشت خطی (Waitlisted)', value: 'waitlisted' },
                        { label: 'خواهان کلاس (Class Seeker)', value: 'class_seeker' },
                        { label: 'به مدرس معرفی شده (Referred)', value: 'referred_to_teacher' },
                        { label: 'جذب شده (Absorbed)', value: 'absorbed' },
                        { label: 'تثبیت‌شده (Stabilized)', value: 'stabilized' },
                        { label: 'حذف شده (Removed)', value: 'removed' },
                      ],
                    },
                    {
                      name: 'currentClass',
                      label: 'کلاس فعلی',
                      type: 'relationship',
                      relationTo: 'classes',
                      hasMany: false,
                      index: true,
                      filterOptions: {
                        status: {
                          not_in: ['cancelled', 'ended'],
                        },
                      },
                      admin: {
                        width: '50%',
                        description: 'هر دانش‌آموز حداکثر در یک کلاس عضویت دارد.',
                      },
                      access: {
                        update: isAdminField,
                      },
                    },
                  ],
                },
                {
                  name: 'removedReason',
                  label: 'دلیل حذف از چرخه',
                  type: 'text',
                  admin: {
                    description: 'در صورت انتخاب وضعیت حذف‌شده، ذکر دلیل الزامی است.',
                    condition: (data) => data?.status === 'removed',
                  },
                  access: {
                    update: isAdminField,
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'گاه‌شمار و نقاط عطف چرخه عمر',
              admin: {
                initCollapsed: false,
              },
              fields: [
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
                        components: {
                          Field: '/components/JalaliDateField#JalaliDateField',
                        },
                      },
                    },
                    {
                      name: 'absorbedAt',
                      label: 'تاریخ اولین حضور',
                      type: 'date',
                      admin: {
                        width: '33%',
                        description: 'تاریخ تایید حضور واقعی در کلاس توسط کارشناس پیگیری.',
                        components: {
                          Field: '/components/JalaliDateField#JalaliDateField',
                        },
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
                        components: {
                          Field: '/components/JalaliDateField#JalaliDateField',
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
