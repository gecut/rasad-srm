import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '../access/roles'

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
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (!data) return data

        // Auto-assign specialist to logged in user if not explicitly provided
        if (operation === 'create' && !data.specialist && req.user) {
          data.specialist = req.user.id
        }

        // Validate specialist role
        if (data.specialist) {
          const specialistId =
            typeof data.specialist === 'object' && 'id' in data.specialist
              ? data.specialist.id
              : data.specialist

          const specialistUser = await req.payload.findByID({
            collection: 'users',
            id: specialistId as number,
            req,
          })

          if (
            !specialistUser ||
            !['admin', 'employee', 'follow_up_specialist'].includes(specialistUser.role)
          ) {
            throw new Error(
              'کارشناس ثبت‌کننده پیگیری باید دارای نقش مجاز (admin, employee, follow_up_specialist) باشد.',
            )
          }
        }

        return data
      },
    ],
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
