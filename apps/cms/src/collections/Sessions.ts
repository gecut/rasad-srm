import { APIError, type CollectionConfig } from 'payload'
import { lockTransaction } from '../domain/shared/core'
import { isEmployeeOrAdmin, isStaff } from '../access/roles'
import { relationID } from '../domain/shared/core'

export const Sessions: CollectionConfig = {
  slug: 'sessions',
  labels: { singular: 'سانس', plural: 'سانس‌ها' },
  admin: {
    group: 'رویدادها',
    defaultColumns: ['ceremony', 'title', 'startsAt', 'endsAt', 'status'],
  },
  access: {
    read: isStaff,
    create: isEmployeeOrAdmin,
    update: isEmployeeOrAdmin,
    delete: isEmployeeOrAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const merged = { ...originalDoc, ...data }
        if (merged.endsAt && new Date(merged.endsAt) <= new Date(merged.startsAt))
          throw new APIError('زمان پایان باید پس از زمان شروع باشد.', 422)
        // Administrative edits share the workflow lock, including scheduling changes.
        const tx = await req.transactionID
        if (!tx) throw new APIError('تراکنش پایگاه داده در دسترس نیست.', 500)
        const ceremonyId = relationID(merged.ceremony)
        await lockTransaction(req.payload, req, `ceremony:${ceremonyId}`)
        if (originalDoc?.id && relationID(originalDoc.ceremony) !== ceremonyId)
          throw new APIError('مراسم سانس پس از ایجاد قابل تغییر نیست.', 422)
        if (merged.status === 'filling' && originalDoc?.status !== 'filling') {
          if (!req.context.domainAction)
            throw new APIError('برای آغاز دعوت از عملیات پیشروی سانس استفاده کنید.', 422)
          const existing = await req.payload.count({
            collection: 'sessions',
            where: {
              and: [
                { ceremony: { equals: ceremonyId } },
                { status: { equals: 'filling' } },
                ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
              ],
            },
            req,
          })
          if (existing.totalDocs) throw new APIError('سانس دیگری در حال دعوت است.', 409)
          data.fillingStartedAt = new Date().toISOString()
        }
        if (
          originalDoc?.status === 'filling' &&
          merged.status !== 'filling' &&
          !req.context.domainAction
        )
          throw new APIError('ابتدا سانس را با عملیات پیشروی ببندید.', 422)
        return data
      },
    ],
  },
  fields: [
    {
      name: 'ceremony',
      label: 'مراسم',
      type: 'relationship',
      relationTo: 'ceremonies',
      required: true,
      index: true,
    },
    { name: 'title', label: 'عنوان', type: 'text' },
    {
      name: 'startsAt',
      label: 'زمان شروع',
      type: 'date',
      required: true,
      index: true,
      admin: { components: { Field: '/components/JalaliDateField#JalaliDateField' } },
    },
    {
      name: 'endsAt',
      label: 'زمان پایان',
      type: 'date',
      admin: { components: { Field: '/components/JalaliDateField#JalaliDateField' } },
    },
    {
      name: 'status',
      label: 'وضعیت',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'پیش‌نویس', value: 'draft' },
        { label: 'در انتظار', value: 'queued' },
        { label: 'در حال دعوت', value: 'filling' },
        { label: 'دعوت بسته', value: 'sealed' },
        { label: 'در حال اجرا', value: 'active' },
        { label: 'پایان یافته', value: 'completed' },
        { label: 'لغو شده', value: 'cancelled' },
      ],
    },
    { name: 'fillingStartedAt', label: 'آغاز دعوت', type: 'date', admin: { readOnly: true } },
  ],
}
