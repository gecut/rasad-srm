import {
  CalendarDateTime,
  GregorianCalendar,
  PersianCalendar,
  parseAbsolute,
  toCalendar,
  toZoned,
} from '@internationalized/date'
export const operationalTimezone = 'Asia/Tehran'
const calendar = new PersianCalendar()
export function jalaliParts(iso?: string | null) {
  if (!iso) return { date: '', time: '' }
  const d = toCalendar(parseAbsolute(iso, operationalTimezone), calendar)
  return {
    date: `${d.year}/${String(d.month).padStart(2, '0')}/${String(d.day).padStart(2, '0')}`,
    time: `${String(d.hour).padStart(2, '0')}:${String(d.minute).padStart(2, '0')}`,
  }
}
export function jalaliInstant(date: string, time: string): string {
  const latin = (s: string) =>
    s
      .replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
      .replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(latin(date))
  const clock = /^(\d{1,2}):(\d{2})$/.exec(latin(time))
  if (!match || !clock) throw new Error('تاریخ و ساعت معتبر وارد کنید.')
  const [year, month, day] = match.slice(1).map(Number),
    [hour, minute] = clock.slice(1).map(Number)
  const d = new CalendarDateTime(calendar, year, month, day, hour, minute)
  if (d.year !== year || d.month !== month || d.day !== day || hour > 23 || minute > 59)
    throw new Error('تاریخ یا ساعت معتبر نیست.')
  return toZoned(
    toCalendar(d, new GregorianCalendar()),
    operationalTimezone,
    'reject',
  ).toAbsoluteString()
}
