export function stabilizationAllowed(absorbedAt: string, now = new Date()): boolean {
  const date = new Date(absorbedAt)
  if (!Number.isFinite(date.getTime())) return false
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + 6)
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, last))
  return now >= date
}
