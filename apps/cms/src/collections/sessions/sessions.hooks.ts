import { APIError, type CollectionBeforeChangeHook } from 'payload'
import { lockTransaction, relationID } from '../../domain/shared/core'

export const validateAndLockSessionBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
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
    if (operation === 'create' && !req.context.domainAction)
      throw new APIError('برای آغاز دعوت از عملیات پیشروی سانس استفاده کنید.', 422)
    const existing = await req.payload.find({
      collection: 'sessions',
      where: {
        and: [
          { ceremony: { equals: ceremonyId } },
          { status: { equals: 'filling' } },
          ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
        ],
      },
      depth: 0,
      req,
    })
    for (const sessionDoc of existing.docs) {
      await req.payload.update({
        collection: 'sessions',
        id: sessionDoc.id,
        data: { status: 'sealed' },
        context: { domainAction: true },
        req,
      })
    }
    data.fillingStartedAt = data.fillingStartedAt || new Date().toISOString()
  }
  return data
}
