import { it, expect } from 'vitest'
import { jalaliInstant, jalaliParts } from '@/lib/jalali'
import { stabilizationAllowed } from '@/domain/shared/lifecycle'
it('converts Persian date/time to Tehran instant and back', () => {
  const iso = jalaliInstant('۱۴۰۵/۰۷/۰۲', '۱۷:۳۰')
  expect(iso).toBe('2026-09-24T14:00:00.000Z')
  expect(jalaliParts(iso)).toEqual({ date: '1405/07/02', time: '17:30' })
})
it('rejects invalid Jalali dates and time without silently clamping', () => {
  expect(() => jalaliInstant('1404/12/30', '17:00')).toThrow()
  expect(() => jalaliInstant('1405/07/02', '25:00')).toThrow()
})
it('stabilization uses six calendar months rather than 180 days', () => {
  expect(stabilizationAllowed('2026-03-31T12:00:00Z', new Date('2026-09-29T12:00:00Z'))).toBe(false)
  expect(stabilizationAllowed('2026-03-31T12:00:00Z', new Date('2026-09-30T12:00:00Z'))).toBe(true)
})
it('defaults to 12:00 local noon when time is omitted or empty', () => {
  const iso = jalaliInstant('۱۴۰۵/۰۷/۰۲')
  expect(jalaliParts(iso)).toEqual({ date: '1405/07/02', time: '12:00' })
})
