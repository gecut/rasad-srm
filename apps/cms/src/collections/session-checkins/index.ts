import type { CollectionConfig } from 'payload'
import { isStaff } from '../../access/roles'
import { populateCeremonyFromSession } from './session-checkins.hooks'

export const SessionCheckins: CollectionConfig = {
  slug: 'session-checkins',
  labels: { singular: 'پذیرش', plural: 'پذیرش‌ها' },
  admin: {
    group: 'رویدادها',
    defaultColumns: ['student', 'ceremony', 'session', 'checkedInAt', 'source'],
  },
  access: { read: isStaff, create: () => false, update: () => false, delete: () => false },
  indexes: [
    { fields: ['student', 'session'], unique: true },
    { fields: ['student', 'ceremony'] },
  ],
  hooks: {
    beforeValidate: [populateCeremonyFromSession],
  },
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
      admin: { readOnly: true },
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
