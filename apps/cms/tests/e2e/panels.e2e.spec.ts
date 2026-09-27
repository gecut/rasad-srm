import { test, expect, type Page } from '@playwright/test'
async function login(page: Page, phone: string, path: string) {
  await page.goto('/login')
  await page.getByLabel('شماره موبایل').fill(phone)
  await page.getByLabel('رمز عبور').fill('TestPassword123!')
  await page.getByRole('button', { name: 'ورود', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(path + '$'))
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
}
test('inviter accepts a claimed student using real API and cannot browse students', async ({
  page,
}) => {
  await login(page, '09120000002', '/invite')
  await page
    .getByRole('combobox', { name: 'مراسم', exact: true })
    .selectOption({ label: 'مراسم آزمون' })
  await page.getByRole('button', { name: 'دریافت دانش‌آموز بعدی' }).click()
  await expect(page.getByRole('heading', { name: 'دانش آزمون' })).toBeVisible()
  expect((await page.request.get('/api/students')).status()).toBe(403)
  await page.getByRole('button', { name: 'ثبت نتیجه تماس' }).click()
  await expect(
    page.getByText('نتیجه ثبت شد. برای ادامه، دانش‌آموز بعدی را دریافت کنید.'),
  ).toBeVisible()
  await page.screenshot({ path: '.reports/invite-mobile.png', fullPage: true })
})
test('teacher confirms absorption and cannot access invitation', async ({ page }) => {
  await login(page, '09120000003', '/teacher')
  await page.getByRole('button', { name: 'تأیید جذب', exact: true }).click()
  await page.getByRole('button', { name: 'تأیید و ثبت' }).click()
  await expect(page.getByRole('button', { name: 'تأیید جذب', exact: true })).toHaveCount(0)
  expect((await page.request.get('/api/panel/context')).status()).toBe(403)
  await page.screenshot({ path: '.reports/teacher-mobile.png', fullPage: true })
})
test('reception finds student, checks in and atomically creates walkin', async ({ page }) => {
  await login(page, '09120000004', '/reception')
  await page
    .getByRole('combobox', { name: 'مراسم', exact: true })
    .selectOption({ label: 'مراسم آزمون' })
  await page.getByRole('combobox', { name: 'سانس پذیرش', exact: true }).selectOption({ index: 1 })
  const search = page.getByLabel('نام یا شماره موبایل دانش‌آموز')
  await search.fill('آزمون')
  await page.getByRole('button', { name: 'جست‌وجو', exact: true }).click()
  await page.getByRole('button', { name: 'ثبت حضور', exact: true }).click()
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('')
  await page.getByRole('button', { name: 'دانش‌آموز جدید', exact: true }).click()
  await page.getByLabel('نام', { exact: true }).fill('مهمان')
  await page.getByLabel('نام خانوادگی', { exact: true }).fill('حضوری')
  await page.getByRole('button', { name: 'ثبت دانش‌آموز و حضور' }).click()
  await expect(search).toBeFocused()
  await page.screenshot({ path: '.reports/reception-mobile.png', fullPage: true })
})

test('Admin manages Students and exposes Persian schedule fields', async ({ page }) => {
  const response = await page.request.post('/api/users/login', {
    data: { email: 'e2e-admin@example.test', password: 'TestPassword123!' },
  })
  expect(response.ok()).toBe(true)
  await page.goto('http://localhost:3000/admin/collections/students')
  await expect(page.getByRole('heading', { name: 'دانش‌آموزان', exact: true })).toBeVisible()
  await page.goto('http://localhost:3000/admin/collections/sessions/create')
  await expect(page.getByLabel('زمان شروع تاریخ شمسی')).toBeVisible()
  await page.getByLabel('زمان شروع تاریخ شمسی').fill('۱۴۰۵/۰۷/۰۲')
  await page.getByLabel('زمان شروع ساعت').fill('17:30')
  await page.screenshot({ path: '.reports/admin-jalali.png', fullPage: true })
})

test('Admin advances the ceremony from its own origin and rejects foreign origins', async ({
  page,
}) => {
  await page.request.post('/api/users/login', {
    data: { email: 'e2e-admin@example.test', password: 'TestPassword123!' },
  })
  const context = await page.request.get('/api/panel/context')
  const { ceremonies } = await context.json()
  const ceremony =
    ceremonies.find(
      (item: { name: string; title: string }) =>
        item.name === 'مراسم آزمون' || item.title === 'مراسم آزمون',
    ) || ceremonies[0]
  const current = ceremony.sessions.find(
    (session: { status: string }) => session.status === 'filling',
  )
  const denied = await page.request.post('/api/panel/ceremony/advance', {
    headers: { origin: 'https://untrusted.example' },
    data: { ceremonyId: ceremony.id, expectedSessionId: current.id },
  })
  expect(denied.status()).toBe(403)
  await page.goto(`http://localhost:3000/admin/collections/ceremonies/${ceremony.id}`)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'آغاز دعوت / پیشروی سانس' }).click()
  await expect(page.getByText('دعوت بسته شد؛ سانس آماده دیگری وجود ندارد.')).toBeVisible()
})
