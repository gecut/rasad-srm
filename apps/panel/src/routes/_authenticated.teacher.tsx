import { createFileRoute, redirect } from '@tanstack/react-router'
import { home } from '../lib/auth'
import { Teacher } from '../features/teacher'
export const Route = createFileRoute('/_authenticated/teacher')({
  beforeLoad: ({ context }) => {
    if (!(context.user.role === 'teacher')) {
      const target = home(context.user)
      if (target === '/admin') throw redirect({ href: target })
      throw redirect({ to: target })
    }
  },
  component: Page,
})
function Page() {
  const { user } = Route.useRouteContext()
  return user.role === 'teacher' ? <Teacher /> : <p role="alert">به پنل مدرس دسترسی ندارید.</p>
}
