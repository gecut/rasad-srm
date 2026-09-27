import type { CollectionConfig } from 'payload'
import { isStaff } from '../access/roles'

export const Invitations: CollectionConfig = {
  slug: 'invitations',
  labels: { singular: 'دعوت', plural: 'دعوت‌ها' },
  admin: {
    group: 'رویدادها',
    defaultColumns: [
      'student',
      'ceremony',
      'outcome',
      'assignedSession',
      'processedAt',
      'smsStatus',
    ],
  },
  access: { read: isStaff, create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['student', 'ceremony'], unique: true }],
  fields: [
    {
      name: 'student',
      label: 'دانش‌آموز',
      type: 'relationship',
      relationTo: 'students',
      required: true,
      index: true,
    },
    {
      name: 'ceremony',
      label: 'مراسم',
      type: 'relationship',
      relationTo: 'ceremonies',
      required: true,
      index: true,
    },
    {
      name: 'assignedSession',
      label: 'سانس پذیرفته‌شده',
      type: 'relationship',
      relationTo: 'sessions',
    },
    {
      name: 'processedSession',
      label: 'سانس هنگام تماس',
      type: 'relationship',
      relationTo: 'sessions',
      required: true,
    },
    {
      name: 'inviter',
      label: 'دعوت‌کننده',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'outcome',
      label: 'نتیجه',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'پذیرفته شد', value: 'accepted' },
        { label: 'سانس دیگر', value: 'needs_alternative_session' },
        { label: 'بی‌پاسخ و پیامک', value: 'no_answer_sms' },
        { label: 'ناموفق', value: 'failed' },
      ],
    },
    { name: 'note', label: 'یادداشت', type: 'textarea' },
    {
      name: 'smsStatus',
      label: 'وضعیت پیامک',
      type: 'select',
      defaultValue: 'not_required',
      options: ['not_required', 'queued', 'sent', 'failed'],
    },
    { name: 'processedAt', label: 'زمان تماس', type: 'date', required: true },
    { name: 'attempts', label: 'سوابق تماس', type: 'json' },
  ],
}
