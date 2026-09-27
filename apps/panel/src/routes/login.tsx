import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Alert, Button, Card } from '@heroui/react'
import type { User } from '@rasad/contracts'
import { ErrorNotice, Field } from '../components/ui'
import { errorMessage, getAdminUrl, normalizePhone, request } from '../lib/api'
import { isOperationalRole, operationalHome, session } from '../lib/auth'

const ADMIN_RESTRICTED_MESSAGE =
  'این حساب کاربری دسترسی به پنل عملیاتی ندارد. لطفاً فقط به پنل مدیریت مراجعه کنید.'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { reason?: string } => ({
    reason: typeof search.reason === 'string' ? search.reason : undefined,
  }),
  component: Login,
})

function Login() {
  const router = useRouter()
  const { reason } = Route.useSearch()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(reason === 'admin_restricted' ? ADMIN_RESTRICTED_MESSAGE : '')
  const [showAdminLink, setShowAdminLink] = useState(reason === 'admin_restricted')

  return (
    <main className="min-h-[85vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border bg-surface shadow-sm">
        <Card.Header className="text-center pb-2">
          <Card.Title className="text-2xl font-bold tracking-tight">ورود به سامانه رصد</Card.Title>
          <Card.Description className="text-sm text-muted mt-1">
            پنل عملیاتی و ثبت رویدادها
          </Card.Description>
        </Card.Header>

        <Card.Content>
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (busy) return
              setBusy(true)
              setError('')
              setShowAdminLink(false)
              try {
                const { user } = await request<{ user: User }>('/users/login', {
                  username: normalizePhone(phone),
                  password,
                })
                session.clear()

                if (!isOperationalRole(user.role)) {
                  await request('/users/logout', {}).catch(() => {})
                  session.clear()
                  setError(ADMIN_RESTRICTED_MESSAGE)
                  setShowAdminLink(true)
                  return
                }

                const target = operationalHome(user.role)
                await router.navigate({ to: target })
              } catch (error) {
                setError(errorMessage(error))
              } finally {
                setBusy(false)
              }
            }}
          >
            <Field
              required
              label="شماره موبایل"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              autoFocus
            />
            <Field
              required
              label="رمز عبور"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />

            <ErrorNotice message={error} />

            {showAdminLink && (
              <Alert status="warning" className="my-1">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>دسترسی محدود به ادمین</Alert.Title>
                  <Alert.Description>{ADMIN_RESTRICTED_MESSAGE}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {showAdminLink && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onPress={() => {
                  window.location.href = getAdminUrl()
                }}
              >
                ورود به پنل مدیریت
              </Button>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isDisabled={busy}>
              {busy ? 'در حال ورود…' : 'ورود به حساب'}
            </Button>
          </form>
        </Card.Content>
      </Card>
    </main>
  )
}
