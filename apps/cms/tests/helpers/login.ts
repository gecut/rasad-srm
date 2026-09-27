import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export interface LoginOptions {
  page: Page
  serverURL?: string
  user: {
    email: string
    password: string
  }
}

/**
 * Logs the user into the admin panel via the login page.
 */
export async function login({
  page,
  serverURL = 'http://localhost:3000',
  user,
}: LoginOptions): Promise<void> {
  const response = await page.request.post(`${serverURL}/api/users/login`, { data: user })
  expect(response.ok()).toBe(true)
  await page.goto(`${serverURL}/admin`)
  await expect(page).toHaveURL(`${serverURL}/admin`)
}
