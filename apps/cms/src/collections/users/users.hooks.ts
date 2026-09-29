import {
  APIError,
  type CollectionBeforeValidateHook,
  type CollectionBeforeLoginHook,
} from 'payload'
import { normalizePhone, relationID } from '../../domain/shared/core'

export const validateUserBeforeValidate: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
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
}

export const checkUserActiveBeforeLogin: CollectionBeforeLoginHook = ({ user }) => {
  if (user.status !== 'active') throw new APIError('حساب کاربری غیرفعال است.', 403)
  return user
}
