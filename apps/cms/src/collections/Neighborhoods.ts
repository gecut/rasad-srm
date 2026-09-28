import type { CollectionConfig } from 'payload'
import { isEmployeeOrAdmin, isStaff } from '../access/roles'

export const Neighborhoods: CollectionConfig = {
  slug: 'neighborhoods',
  labels: {
    singular: 'محدوده منزل',
    plural: 'محدوده‌های منزل',
  },
  admin: {
    group: 'افراد',
    useAsTitle: 'name',
    defaultColumns: ['name', 'createdAt'],
  },
  access: {
    read: isStaff,
    create: isEmployeeOrAdmin,
    update: isEmployeeOrAdmin,
    delete: isEmployeeOrAdmin,
  },
  fields: [
    {
      name: 'name',
      label: 'نام محدوده',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'description',
      label: 'توضیحات',
      type: 'textarea',
    },
    {
      name: 'subDistricts',
      label: 'محله‌ها و معابر تحت پوشش',
      type: 'array',
      labels: {
        singular: 'محله / معبر',
        plural: 'محله‌ها و معابر',
      },
      admin: {
        description:
          'لیست محله‌ها، خیابان‌ها و نقاط شاخص این محدوده جهت جستجو و دسته‌بندی سریع (مانند: هفت تیر، حافظ، صدف)',
      },
      fields: [
        {
          name: 'name',
          label: 'نام محله یا خیابان',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
}
