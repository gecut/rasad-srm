import { createFileRoute, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { Button, Chip } from '@heroui/react'
import { useState } from 'react'
import { isOperationalRole, session } from '../lib/auth'
import { errorMessage, request } from '../lib/api'
import { ErrorNotice } from '../components/ui'

const ROLE_LABELS: Record<string, string> = {
  inviter: 'مسئول دعوت',
  receptionist: 'پذیرش مراسم',
  teacher: 'مدرس',
  admin: 'مدیر سیستم',
  employee: 'کارمند',
  follow_up_specialist: 'کارشناس پیگیری',
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const user = await session.get()
    if (!user) throw redirect({ to: '/login' })
    if (!isOperationalRole(user.role)) {
      await request('/users/logout', {}).catch(() => {})
      session.clear()
      throw redirect({ to: '/login', search: { reason: 'admin_restricted' } })
    }
    return { user }
  },
  component: Shell,
})

function Shell() {
  const router = useRouter()
  const { user } = Route.useRouteContext()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const roleLabel = ROLE_LABELS[user.role] || user.role

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-surface/80 sticky top-0 z-30 backdrop-blur-md px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/" aria-label="صفحه اصلی رصد" className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-foreground">رصد</span>
            </a>
            <Chip color="accent" variant="soft">
              {roleLabel}
            </Chip>
          </div>

          <div className="flex items-center gap-3">
            {user.username && (
              <span className="text-xs sm:text-sm text-muted font-mono hidden sm:inline" dir="ltr">
                <bdi>{user.username}</bdi>
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              isDisabled={busy}
              onPress={async () => {
                setBusy(true)
                try {
                  await request('/users/logout', {})
                  session.clear()
                  await router.navigate({ to: '/login' })
                } catch (error) {
                  setError(errorMessage(error))
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? 'در حال خروج…' : 'خروج'}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <ErrorNotice message={error} />
        <Outlet />
      </main>
    </div>
  )
}
