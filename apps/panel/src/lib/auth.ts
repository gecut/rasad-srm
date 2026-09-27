import type { User } from '@rasad/contracts'
import { APIError, getCurrentUser } from './api.ts'
let current: Promise<User | null> | undefined
export const session = {
  get: () =>
    (current ??= getCurrentUser()
      .then((result) => result.user || null)
      .catch((error) => {
        current = undefined
        if (error instanceof APIError && error.status === 401) return null
        throw error
      })),
  clear: () => {
    current = undefined
  },
}
export const OPERATIONAL_ROLES = ['teacher', 'inviter', 'receptionist'] as const
export type OperationalRole = (typeof OPERATIONAL_ROLES)[number]
export const isOperationalRole = (role: string): role is OperationalRole =>
  OPERATIONAL_ROLES.includes(role as OperationalRole)
export const canAccessPanel = (user: User | null | undefined): boolean =>
  Boolean(user && isOperationalRole(user.role))

export function operationalHome(role: OperationalRole): '/invite' | '/teacher' | '/reception' {
  return role === 'teacher' ? '/teacher' : role === 'receptionist' ? '/reception' : '/invite'
}

export function home(user: User): '/invite' | '/teacher' | '/reception' | '/admin' {
  return isOperationalRole(user.role) ? operationalHome(user.role) : '/admin'
}
