import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { APIError, normalizePhone, request } from '../src/lib/api.ts'
import { home, session } from '../src/lib/auth.ts'
import { formatDate } from '../src/lib/date.ts'

const originalFetch = globalThis.fetch
const redirects: string[] = []
Object.defineProperty(globalThis, 'location', {
  value: { pathname: '/invite', assign: (path: string) => redirects.push(path) },
  configurable: true,
})
afterEach(() => {
  globalThis.fetch = originalFetch
  session.clear()
  redirects.length = 0
})

function respond(status: number, body: unknown) {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

test('workflow SDK sends same-origin cookies and the submitted intent', async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/api/panel/invite/submit')
    assert.equal(init?.credentials, 'include')
    assert.equal(init?.method, 'POST')
    assert.deepEqual(JSON.parse(String(init?.body)), { outcome: 'accepted', note: 'یادداشت' })
    return new Response(JSON.stringify({ saved: true }))
  }
  assert.deepEqual(
    await request('/panel/invite/submit', { outcome: 'accepted', note: 'یادداشت' }),
    { saved: true },
  )
})

test('duplicate candidates survive the SDK consuming its error body', async () => {
  const details = {
    error: 'دانش‌آموز مشابه پیدا شد.',
    candidates: [{ id: 42, firstName: 'علی', lastName: 'رضایی' }],
  }
  respond(409, details)
  await assert.rejects(
    request('/panel/reception/walkin', { firstName: 'علی' }),
    (error: unknown) => {
      assert.ok(error instanceof APIError)
      assert.equal(error.status, 409)
      assert.deepEqual(error.details, details)
      return true
    },
  )
})

test('unexpected server diagnostics are never rendered to operators', async () => {
  respond(500, { error: 'SQL database password or stack trace' })
  await assert.rejects(request('/panel/teacher'), (error: unknown) => {
    assert.ok(error instanceof APIError)
    assert.equal(error.message, 'خطای موقت سرور. دوباره تلاش کنید.')
    return true
  })
})

test('expired workflow sessions return to login while failed login stays in place', async () => {
  respond(401, {})
  await assert.rejects(request('/panel/teacher'))
  assert.deepEqual(redirects, ['/login'])
  redirects.length = 0
  await assert.rejects(
    request('/users/login', { username: '09123456789', password: 'invalid' }),
    (error: unknown) => {
      assert.ok(error instanceof APIError)
      assert.equal(error.message, 'شماره موبایل یا رمز عبور درست نیست.')
      return true
    },
  )
  assert.deepEqual(redirects, [])
})

test('auth bootstrap retries network failures instead of caching a false logout', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('offline')
  }
  await assert.rejects(session.get())
  respond(200, { user: { id: 1, role: 'teacher' } })
  assert.equal((await session.get())?.role, 'teacher')
})

test('missing session resolves to null', async () => {
  respond(200, { user: null })
  assert.equal(await session.get(), null)
})

test('each operational role has its own home and management roles use Admin', () => {
  for (const [role, expected] of Object.entries({
    teacher: '/teacher',
    inviter: '/invite',
    receptionist: '/reception',
    admin: '/admin',
    employee: '/admin',
    follow_up_specialist: '/admin',
  })) {
    assert.equal(home({ role } as Parameters<typeof home>[0]), expected)
  }
})

test('Persian and Arabic phone digits normalize before submission', () => {
  assert.equal(normalizePhone('+۹۸ (۹۱۲) ۳۴۵-۶۷۸۹'), '09123456789')
  assert.equal(normalizePhone('٠٠٩٨٩١٢٣٤٥٦٧٨٩'), '09123456789')
})

test('date presentation uses Persian calendar and Tehran time', () => {
  const date = formatDate('2026-03-21T09:00:00.000Z')
  assert.match(date, /۱۴۰۵/)
  assert.match(date, /۱۲:۳۰/)
})
