import { describe, it, expect, vi } from 'vitest'
import { syncStudentAttendedCeremonies } from '@/collections/session-checkins/session-checkins.hooks'

describe('syncStudentAttendedCeremonies', () => {
  it('queries all distinct ceremonies for student and updates attendedCeremonies', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [{ ceremony: 101 }, { ceremony: 102 }, { ceremony: 101 }],
    })
    const update = vi.fn().mockResolvedValue({})
    const payload = { find, update } as any
    const req = {} as any

    await syncStudentAttendedCeremonies(payload, 50, req)

    expect(find).toHaveBeenCalledWith({
      collection: 'session-checkins',
      where: { student: { equals: 50 } },
      depth: 0,
      pagination: false,
      select: { ceremony: true },
      overrideAccess: true,
      req,
    })
    expect(update).toHaveBeenCalledWith({
      collection: 'students',
      id: 50,
      data: { attendedCeremonies: [101, 102] },
      overrideAccess: true,
      req,
    })
  })

  it('handles empty check-ins by setting attendedCeremonies to empty array', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const update = vi.fn().mockResolvedValue({})
    const payload = { find, update } as any
    const req = {} as any

    await syncStudentAttendedCeremonies(payload, 60, req)

    expect(update).toHaveBeenCalledWith({
      collection: 'students',
      id: 60,
      data: { attendedCeremonies: [] },
      overrideAccess: true,
      req,
    })
  })
})
