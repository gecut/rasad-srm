import type { CollectionBeforeValidateHook } from 'payload'

export const validateAndAssignSpecialist: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
}) => {
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
}
