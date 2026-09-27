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
export function home(user: User): '/invite' | '/teacher' | '/reception' | '/admin' {
  return user.role === 'teacher'
    ? '/teacher'
    : user.role === 'receptionist'
      ? '/reception'
      : user.role === 'inviter'
        ? '/invite'
        : '/admin'
}
