import type { CollectionConfig } from 'payload'
import { isEmployeeOrAdmin, isStaff } from '../access/roles'

export const Teachers: CollectionConfig = {
  slug: 'teachers',
  labels: {
    singular: 'مدرس',
    plural: 'مدرسان',
  },
  admin: {
    group: 'افراد',
    useAsTitle: 'lastName',
    defaultColumns: ['firstName', 'lastName', 'mobile', 'status'],
  },
  access: {
    read: isStaff,
    create: isEmployeeOrAdmin,
    update: isEmployeeOrAdmin,
    delete: isEmployeeOrAdmin,
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
