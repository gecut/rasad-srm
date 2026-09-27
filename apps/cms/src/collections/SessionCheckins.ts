import type { CollectionConfig } from 'payload'
import { isStaff } from '../access/roles'
export const SessionCheckins: CollectionConfig = {
  slug: 'session-checkins',
  labels: { singular: 'پذیرش', plural: 'پذیرش‌ها' },
  admin: { group: 'رویدادها', defaultColumns: ['student', 'session', 'checkedInAt', 'source'] },
  access: { read: isStaff, create: () => false, update: () => false, delete: () => false },
  indexes: [{ fields: ['student', 'session'], unique: true }],
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
      name: 'session',
      label: 'سانس',
      type: 'relationship',
      relationTo: 'sessions',
      required: true,
      index: true,
    },
    {
      name: 'checkedInBy',
      label: 'پذیرش‌کننده',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    { name: 'checkedInAt', label: 'زمان ورود', type: 'date', required: true },
    {
      name: 'source',
      label: 'نوع حضور',
      type: 'select',
      required: true,
      options: [
        { label: 'دعوت شده', value: 'invited' },
        { label: 'مراجعه حضوری', value: 'walk_in' },
      ],
    },
    { name: 'note', label: 'یادداشت', type: 'textarea' },
  ],
}
