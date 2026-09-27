import { createFileRoute, redirect } from '@tanstack/react-router'
import { home } from '../lib/auth'
import { Reception } from '../features/reception'
export const Route = createFileRoute('/_authenticated/reception')({
  beforeLoad: ({ context }) => {
    if (!(context.user.role === 'receptionist')) {
      const target = home(context.user)
      if (target === '/admin') throw redirect({ href: target })
      throw redirect({ to: target })
    }
  },
  component: Page,
})
function Page() {
  const { user } = Route.useRouteContext()
  return user.role === 'receptionist' ? (
    <Reception />
  ) : (
    <p role="alert">به پنل پذیرش دسترسی ندارید.</p>
  )
}
