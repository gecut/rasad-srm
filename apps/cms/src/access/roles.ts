import type { Access } from 'payload'

export const isAdmin: Access = ({ req }) => {
  return req.user?.status === 'active' && req.user.role === 'admin'
}

export const isEmployeeOrAdmin: Access = ({ req }) => {
  return Boolean(req.user?.status === 'active' && ['admin', 'employee'].includes(req.user.role))
}

export const isStaff: Access = ({ req }) => {
  if (!req.user || req.user.status !== 'active') return false
  return ['admin', 'employee', 'follow_up_specialist'].includes(req.user.role)
}

export const isSpecialistOrAdmin: Access = ({ req }) => {
  if (!req.user || req.user.status !== 'active') return false
  return req.user.role === 'admin' || req.user.role === 'follow_up_specialist'
}

export const isInviter: Access = ({ req }) => {
  return req.user?.role === 'inviter'
}
