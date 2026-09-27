import { createFileRoute, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { Button } from '@heroui/react'
import { useState } from 'react'
import { session } from '../lib/auth'
import { errorMessage, request } from '../lib/api'
import { ErrorNotice } from '../components/ui'
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const user = await session.get()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  component: Shell,
})
function Shell() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="shell">
      <header>
        <a href="/" aria-label="صفحه اصلی رصد">
          <strong>رصد</strong>
        </a>
        <Button
          variant="secondary"
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
          خروج
        </Button>
      </header>
      <ErrorNotice message={error} />
      <Outlet />
    </div>
  )
}
