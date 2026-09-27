import { createFileRoute, redirect } from '@tanstack/react-router'
import { home } from '../lib/auth'
import { Invitation } from '../features/invitation'
export const Route = createFileRoute('/_authenticated/invite')({
  beforeLoad: ({ context }) => {
    if (!['inviter', 'admin', 'employee'].includes(context.user.role)) {
      const target = home(context.user)
      if (target === '/admin') throw redirect({ href: target })
      throw redirect({ to: target })
    }
  },
  component: Page,
})
function Page() {
  const { user } = Route.useRouteContext()
  return ['inviter', 'admin', 'employee'].includes(user.role) ? (
    <Invitation />
  ) : (
    <p role="alert">به پنل دعوت دسترسی ندارید.</p>
  )
}
