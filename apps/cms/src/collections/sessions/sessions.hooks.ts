import { APIError, type CollectionBeforeChangeHook } from 'payload'
import { lockTransaction, relationID } from '../../domain/shared/core'

export const validateAndLockSessionBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
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
  if (originalDoc?.status === 'filling' && merged.status !== 'filling' && !req.context.domainAction)
    throw new APIError('ابتدا سانس را با عملیات پیشروی ببندید.', 422)
  return data
}
