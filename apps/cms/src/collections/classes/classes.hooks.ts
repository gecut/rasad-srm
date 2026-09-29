import type { CollectionBeforeChangeHook } from 'payload'
import { lockTransaction } from '../../domain/shared/core'

export const lockClassBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (originalDoc?.id) await lockTransaction(req.payload, req, `class:${originalDoc.id}`)
  return data
}
