import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@heroui/react'
import type { User } from '@rasad/contracts'
import { ErrorNotice, Field } from '../components/ui'
import { errorMessage, normalizePhone, request } from '../lib/api'
import { home, session } from '../lib/auth'
export const Route = createFileRoute('/login')({ component: Login })
function Login() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <main className="login">
      <h1>ورود به رصد</h1>
      <form
        className="surface stack"
        onSubmit={async (event) => {
          event.preventDefault()
          if (busy) return
          setBusy(true)
          setError('')
          try {
            const { user } = await request<{ user: User }>('/users/login', {
              username: normalizePhone(phone),
              password,
            })
            session.clear()
            const target = home(user)
            if (target === '/admin') location.assign('/admin')
            else await router.navigate({ to: target })
          } catch (error) {
            setError(errorMessage(error))
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field required label="شماره موبایل" type="tel" value={phone} onChange={setPhone} />
        <Field required label="رمز عبور" type="password" value={password} onChange={setPassword} />
        <ErrorNotice message={error} />
        <Button type="submit" isDisabled={busy}>
          {busy ? 'در حال ورود…' : 'ورود'}
        </Button>
      </form>
    </main>
  )
}
