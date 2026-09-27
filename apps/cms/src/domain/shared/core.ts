import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { User } from '@/payload-types'

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 422,
    public candidates?: unknown[],
  ) {
    super(message)
  }
}
export function relationID(value: number | { id: number }): number {
  return typeof value === 'number' ? value : value.id
}
export function digits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
}
export function normalizePhone(value: string): string {
  let phone = digits(value).replace(/[\s()\-]/g, '')
  if (phone.startsWith('+98')) phone = '0' + phone.slice(3)
  else if (phone.startsWith('0098')) phone = '0' + phone.slice(4)
  if (!/^09\d{9}$/.test(phone)) throw new DomainError('شماره موبایل معتبر نیست.')
  return phone
}
export async function authorize(
  payload: Payload,
  user: User | null | undefined,
  roles: User['role'][],
  req?: PayloadRequest,
): Promise<User> {
  if (!user) throw new DomainError('لطفاً وارد حساب کاربری شوید.', 401)
  // Reload identity so deactivation and role changes take effect immediately.
  const current = await payload.findByID({
    collection: 'users',
    id: user.id,
    depth: 0,
    req,
    overrideAccess: true,
  })
  if (current.status !== 'active' || !roles.includes(current.role))
    throw new DomainError('اجازهٔ انجام این عملیات را ندارید.', 403)
  return current
}
export async function lockTransaction(
  payload: Payload,
  req: PayloadRequest,
  key: string,
): Promise<void> {
  const id = await req.transactionID
  if (!id) throw new Error('Transaction required')
  const db = payload.db as unknown as PostgresAdapter
  await db.sessions[id].db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`)
}
export async function transaction<T>(
  payload: Payload,
  user: User,
  lock: string,
  action: (req: PayloadRequest) => Promise<T>,
  parent?: PayloadRequest,
): Promise<T> {
  if (parent?.transactionID) throw new Error('Domain actions must own their transaction')
  const id = await payload.db.beginTransaction()
  if (!id) throw new Error('PostgreSQL transactions are required')
  const req = await createLocalReq(
    { user, req: parent, context: { ...parent?.context, domainAction: true } },
    payload,
  )
  req.transactionID = id
  try {
    await lockTransaction(payload, req, lock)
    const result = await action(req)
    await payload.db.commitTransaction(id)
    return result
  } catch (error) {
    await payload.db.rollbackTransaction(id)
    throw error
  }
}
