import type { CollectionConfig } from 'payload'
import { isEmployeeOrAdmin, isStaff } from '../access/roles'

export const Ceremonies: CollectionConfig = {
  slug: 'ceremonies',
  labels: {
    singular: 'مراسم',
    plural: 'مراسم‌ها',
  },
  admin: {
    group: 'رویدادها',
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'createdAt'],
  },
  access: {
    read: isStaff, // All authenticated roles including inviter can read ceremonies
    create: isEmployeeOrAdmin,
    update: isEmployeeOrAdmin,
    delete: isEmployeeOrAdmin,
  },
  fields: [
    {
      name: 'advanceSession',
      type: 'ui',
      admin: { components: { Field: '/components/AdvanceSession#AdvanceSession' } },
    },
    {
      name: 'title',
      label: 'عنوان مراسم',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'توضیحات مراسم',
      type: 'textarea',
    },
    {
      name: 'status',
      label: 'وضعیت مراسم',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'پیش‌نویس (Draft)', value: 'draft' },
        { label: 'زمان‌بندی‌شده (Scheduled)', value: 'scheduled' },
        { label: 'فعال (Active)', value: 'active' },
        { label: 'در حال دعوت', value: 'inviting' },
        { label: 'تکمیل‌شده (Completed)', value: 'completed' },
        { label: 'لغوشده (Cancelled)', value: 'cancelled' },
      ],
    },
  ],
}
