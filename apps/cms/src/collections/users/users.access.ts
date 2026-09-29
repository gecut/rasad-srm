import type { Access, PayloadRequest } from 'payload'

export const isUserAdmin: Access = ({ req }) =>
  Boolean(req.user?.role === 'admin' && req.user.status === 'active')

export const canAccessAdminPanel = ({ req }: { req: PayloadRequest }): boolean =>
  Boolean(
    req.user?.status === 'active' &&
      ['admin', 'employee', 'follow_up_specialist'].includes(req.user.role),
  )

export const userReadAccess: Access = ({ req }) =>
  req.user?.status !== 'active'
    ? false
    : req.user.role === 'admin'
      ? true
      : { id: { equals: req.user.id } }
