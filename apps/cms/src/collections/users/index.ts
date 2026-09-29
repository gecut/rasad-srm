import type { CollectionConfig } from 'payload'
import { canAccessAdminPanel, isUserAdmin, userReadAccess } from './users.access'
import { checkUserActiveBeforeLogin, validateUserBeforeValidate } from './users.hooks'

export { isUserAdmin as isAdmin }

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'کاربر', plural: 'کاربران' },
  admin: {
    group: 'سیستم',
    useAsTitle: 'name',
    defaultColumns: ['name', 'username', 'role', 'status'],
  },
  auth: {
    loginWithUsername: { allowEmailLogin: true, requireEmail: false, requireUsername: false },
    maxLoginAttempts: 5,
    lockTime: 600000,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    },
  },
  access: {
    admin: canAccessAdminPanel,
    create: isUserAdmin,
    delete: isUserAdmin,
    update: isUserAdmin,
    read: userReadAccess,
  },
  hooks: {
    beforeValidate: [validateUserBeforeValidate],
    beforeLogin: [checkUserActiveBeforeLogin],
  },
  fields: [
    { name: 'name', label: 'نام', type: 'text', required: true },
    {
      name: 'status',
      label: 'وضعیت',
      type: 'select',
      required: true,
      defaultValue: 'active',
      saveToJWT: true,
      options: [
        { label: 'فعال', value: 'active' },
        { label: 'غیرفعال', value: 'inactive' },
      ],
    },
    {
      name: 'teacherProfile',
      label: 'پرونده مدرس',
      type: 'relationship',
      relationTo: 'teachers',
      unique: true,
    },
    {
      name: 'role',
      label: 'نقش',
      type: 'select',
      required: true,
      defaultValue: 'employee',
      saveToJWT: true,
      access: {
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
      },
      options: [
        { label: 'مدیر', value: 'admin' },
        { label: 'کارمند', value: 'employee' },
        { label: 'کارشناس پیگیری', value: 'follow_up_specialist' },
        { label: 'دعوت‌کننده', value: 'inviter' },
        { label: 'مدرس', value: 'teacher' },
        { label: 'پذیرش', value: 'receptionist' },
      ],
    },
  ],
}
