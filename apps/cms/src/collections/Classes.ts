import type { CollectionConfig } from 'payload'
import { lockTransaction } from '../domain/shared/core'
import { isEmployeeOrAdmin, isStaff } from '../access/roles'

export const Classes: CollectionConfig = {
  slug: 'classes',
  labels: {
    singular: 'کلاس',
    plural: 'کلاس‌ها',
  },
  admin: {
    group: 'آموزش',
    useAsTitle: 'title',
    defaultColumns: ['title', 'primaryTeacher', 'capacity', 'status'],
  },
  access: {
    read: isStaff,
    create: isEmployeeOrAdmin,
    update: isEmployeeOrAdmin,
    delete: isEmployeeOrAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        if (originalDoc?.id) await lockTransaction(req.payload, req, `class:${originalDoc.id}`)
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      label: 'عنوان کلاس',
      type: 'text',
      required: true,
    },
    {
      name: 'primaryTeacher',
      label: 'مدرس اصلی',
      type: 'relationship',
      relationTo: 'teachers',
      required: true,
      hasMany: false,
      admin: {
        description: 'هر کلاس در حال اجرا نیازمند یک مدرس اصلی است.',
      },
    },
    {
      name: 'assistantTeachers',
      label: 'مدرسان کمکی',
      type: 'relationship',
      relationTo: 'teachers',
      hasMany: true,
    },
    {
      name: 'capacity',
      label: 'ظرفیت',
      type: 'number',
      min: 1,
      admin: {
        description: 'ظرفیت کلاس صرفاً جنبه اطلاعاتی دارد و مانع انتساب دانش‌آموز نمی‌شود.',
      },
    },
    {
      name: 'status',
      label: 'وضعیت کلاس',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      options: [
        { label: 'برنامه‌ریزی‌شده (Planned)', value: 'planned' },
        { label: 'فعال (Active)', value: 'active' },
        { label: 'انتقال به مقدمات', value: 'transition_to_preliminaries' },
        { label: 'توقف پذیرش (Admissions Paused)', value: 'admissions_paused' },
        { label: 'معلق (Suspended)', value: 'suspended' },
        { label: 'پایان‌یافته (Ended)', value: 'ended' },
        { label: 'لغوشده (Cancelled)', value: 'cancelled' },
      ],
    },
  ],
}
