import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '../../access/roles'

export const Neighborhoods: CollectionConfig = {
  slug: 'neighborhoods',
  labels: {
    singular: 'ناحیه شهری',
    plural: 'نواحی شهری',
  },
  admin: {
    group: 'مدیریت دانش‌آموزان و آموزش',
    useAsTitle: 'name',
    defaultColumns: ['name', 'createdAt'],
  },
  access: {
    read: isStaff,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      label: 'نام ناحیه شهری',
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
          'لیست محله‌ها، خیابان‌ها و نقاط شاخص این ناحیه جهت جستجو و دسته‌بندی سریع (مانند: هفت تیر، حافظ، صدف)',
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
    {
      name: 'districtClasses',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/DistrictClasses#DistrictClasses',
        },
      },
    },
    {
      name: 'districtStudents',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/DistrictStudents#DistrictStudents',
        },
      },
    },
  ],
}

