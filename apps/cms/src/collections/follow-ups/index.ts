import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '../../access/roles'
import { validateAndAssignSpecialist } from './follow-ups.hooks'

export const FollowUps: CollectionConfig = {
  slug: 'follow-ups',
  labels: {
    singular: 'پیگیری',
    plural: 'پیگیری‌ها',
  },
  admin: {
    group: 'افراد',
    defaultColumns: ['student', 'specialist', 'createdAt', 'note'],
  },
  access: {
    read: isStaff,
    create: isStaff,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [validateAndAssignSpecialist],
  },
  fields: [
    {
      name: 'student',
      label: 'دانش‌آموز',
      type: 'relationship',
      relationTo: 'students',
      required: true,
      index: true,
      admin: {
        description: 'دانش‌آموزی که این پیگیری برای او ثبت شده است.',
      },
    },
    {
      name: 'specialist',
      label: 'کارشناس پیگیری',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'کارشناس یا کاربری که این اقدام را ثبت کرده است.',
      },
    },
    {
      name: 'note',
      label: 'متن پیگیری / نتیجه اقدام',
      type: 'textarea',
      required: true,
    },
  ],
  timestamps: true,
}
