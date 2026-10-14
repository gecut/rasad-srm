import type { Access, FieldAccess } from 'payload'

export const isAdmin: Access = ({ req }) => {
  return req.user?.status === 'active' && req.user.role === 'admin'
}

export const isAdminField: FieldAccess = ({ req }) => {
  return Boolean(req.user?.status === 'active' && req.user?.role === 'admin')
}

export const isEmployeeOrAdmin: Access = ({ req }) => {
  return Boolean(req.user?.status === 'active' && req.user?.role === 'admin')
}

export const isEmployeeOrAdminField: FieldAccess = ({ req }) => {
  return Boolean(req.user?.status === 'active' && req.user?.role === 'admin')
}

export const isStaff: Access = ({ req }) => {
  if (!req.user || req.user.status !== 'active') return false
  return ['admin', 'employee'].includes(req.user.role)
}

export const isSpecialistOrAdmin: Access = ({ req }) => {
  return Boolean(req.user?.status === 'active' && req.user?.role === 'admin')
}

export const isInviter: Access = ({ req }) => {
  return req.user?.role === 'inviter'
}
