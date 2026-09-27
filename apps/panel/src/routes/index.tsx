import { createFileRoute, redirect } from '@tanstack/react-router'
import { home, session } from '../lib/auth'
export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await session.get()
    const target = user ? home(user) : '/login'
    if (target === '/admin') throw redirect({ href: target })
    throw redirect({ to: target })
  },
})
