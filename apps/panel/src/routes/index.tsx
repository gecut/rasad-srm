import { createFileRoute, redirect } from '@tanstack/react-router'
import { isOperationalRole, operationalHome, session } from '../lib/auth'
import { request } from '../lib/api'
export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await session.get()
    if (!user) throw redirect({ to: '/login' })
    if (!isOperationalRole(user.role)) {
      await request('/users/logout', {}).catch(() => {})
      session.clear()
      throw redirect({ to: '/login', search: { reason: 'admin_restricted' } })
    }
    throw redirect({ to: operationalHome(user.role) })
  },
})
