import { APIError, type CollectionConfig, type Access } from 'payload'
import { normalizePhone, relationID } from '../domain/shared/core'

export const isAdmin: Access = ({ req }) =>
  req.user?.role === 'admin' && req.user.status === 'active'
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
    admin: ({ req }) =>
      Boolean(
        req.user?.status === 'active' &&
        ['admin', 'employee', 'follow_up_specialist'].includes(req.user.role),
      ),
    create: isAdmin,
    delete: isAdmin,
    update: isAdmin,
    read: ({ req }) =>
      req.user?.status !== 'active'
        ? false
        : req.user.role === 'admin'
          ? true
          : { id: { equals: req.user.id } },
  },
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req, operation }) => {
        if (!data) return data
        if (
          operation === 'create' &&
          (await req.payload.count({ collection: 'users', req })).totalDocs === 0
        )
          data.role = 'admin'
        if (data.username) data.username = normalizePhone(data.username)
        const merged = { ...originalDoc, ...data }
        if (['teacher', 'inviter', 'receptionist'].includes(merged.role) && !merged.username)
          throw new APIError('شماره موبایل کاربر الزامی است.', 422)
        if (merged.role === 'teacher') {
          if (!merged.teacherProfile)
            throw new APIError('مدرس مرتبط با این حساب را انتخاب کنید.', 422)
          const teacher = await req.payload.findByID({
            collection: 'teachers',
            id: relationID(merged.teacherProfile),
            req,
          })
          if (teacher.status !== 'active') throw new APIError('مدرس باید فعال باشد.', 422)
        }
        return data
      },
    ],
    beforeLogin: [
      ({ user }) => {
        if (user.status !== 'active') throw new APIError('حساب کاربری غیرفعال است.', 403)
        return user
      },
    ],
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
