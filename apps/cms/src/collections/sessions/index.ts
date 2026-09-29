import type { CollectionConfig } from 'payload'
import { isEmployeeOrAdmin, isStaff } from '../../access/roles'
import { validateAndLockSessionBeforeChange } from './sessions.hooks'

export const Sessions: CollectionConfig = {
  slug: 'sessions',
  labels: { singular: 'سانس', plural: 'سانس‌ها' },
  admin: {
    group: 'رویدادها',
    useAsTitle: 'title',
    defaultColumns: ['ceremony', 'title', 'startsAt', 'endsAt', 'status'],
  },
  access: {
    read: isStaff,
    create: isEmployeeOrAdmin,
    update: isEmployeeOrAdmin,
    delete: isEmployeeOrAdmin,
  },
  hooks: {
    beforeChange: [validateAndLockSessionBeforeChange],
  },
  fields: [
    {
      name: 'ceremony',
      label: 'مراسم',
      type: 'relationship',
      relationTo: 'ceremonies',
      required: true,
      index: true,
    },
    { name: 'title', label: 'عنوان', type: 'text' },
    {
      name: 'startsAt',
      label: 'زمان شروع',
      type: 'date',
      required: true,
      index: true,
      admin: { components: { Field: '/components/JalaliDateField#JalaliDateField' } },
    },
    {
      name: 'endsAt',
      label: 'زمان پایان',
      type: 'date',
      admin: { components: { Field: '/components/JalaliDateField#JalaliDateField' } },
    },
    {
      name: 'status',
      label: 'وضعیت',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'پیش‌نویس', value: 'draft' },
        { label: 'در انتظار', value: 'queued' },
        { label: 'در حال دعوت', value: 'filling' },
        { label: 'دعوت بسته', value: 'sealed' },
        { label: 'در حال اجرا', value: 'active' },
        { label: 'پایان یافته', value: 'completed' },
        { label: 'لغو شده', value: 'cancelled' },
      ],
    },
    { name: 'fillingStartedAt', label: 'آغاز دعوت', type: 'date', admin: { readOnly: true } },
    {
      name: 'capacity',
      label: 'ظرفیت پیشنهادی',
      type: 'number',
      min: 1,
      admin: { description: 'ظرفیت مدنظر سانس جهت محاسبه درصد پرشدگی' },
    },
  ],
}
