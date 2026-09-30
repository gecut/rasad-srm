import type { CollectionBeforeValidateHook } from 'payload'
import { relationID } from '../../domain/shared/core'

export const populateCeremonyFromSession: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data || data.ceremony) return data
  const sessionId = data.session ? relationID(data.session) : null
  if (!sessionId) return data

  const session = await req.payload.findByID({
    collection: 'sessions',
    id: sessionId,
    depth: 0,
    req,
  })
  if (session?.ceremony) {
    data.ceremony = relationID(session.ceremony)
  }
  return data
}
