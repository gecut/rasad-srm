import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '../../access/roles'

export const Teachers: CollectionConfig = {
  slug: 'teachers',
  labels: {
    singular: 'مدرس',
    plural: 'مدرسان',
  },
  admin: {
    group: 'مدیریت دانش‌آموزان و آموزش',
    useAsTitle: 'lastName',
    defaultColumns: ['firstName', 'lastName', 'mobile', 'status'],
  },
  access: {
    read: isStaff,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'firstName',
      label: 'نام',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      label: 'نام خانوادگی',
      type: 'text',
      required: true,
    },
    {
      name: 'mobile',
      label: 'شماره همراه',
      type: 'text',
    },
    {
      name: 'status',
      label: 'وضعیت',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'فعال (Active)', value: 'active' },
        { label: 'غیرفعال (Inactive)', value: 'inactive' },
      ],
    },
  ],
}
