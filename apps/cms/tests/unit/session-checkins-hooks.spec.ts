import { describe, it, expect, vi } from 'vitest'
import { populateCeremonyFromSession } from '@/collections/session-checkins/session-checkins.hooks'

describe('populateCeremonyFromSession', () => {
  it('populates ceremony from session if missing in data', async () => {
    const findByID = vi.fn().mockResolvedValue({ id: 10, ceremony: 55 })
    const req = { payload: { findByID } } as any
    const data = { session: 10 } as any
    const result = await populateCeremonyFromSession({ data, req, operation: 'create' } as any)
    expect(findByID).toHaveBeenCalledWith({ collection: 'sessions', id: 10, depth: 0, req })
    expect(result.ceremony).toBe(55)
  })

  it('keeps existing ceremony if already provided', async () => {
    const findByID = vi.fn()
    const req = { payload: { findByID } } as any
    const data = { session: 10, ceremony: 99 } as any
    const result = await populateCeremonyFromSession({ data, req, operation: 'create' } as any)
    expect(findByID).not.toHaveBeenCalled()
    expect(result.ceremony).toBe(99)
  })
})
