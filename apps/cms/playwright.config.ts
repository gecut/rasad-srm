import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: 'test.env' })
const database = process.env.TEST_DATABASE_URL
if (!database || !new URL(database).pathname.endsWith('_test'))
  throw new Error('Disposable TEST_DATABASE_URL ending _test is required')
process.env.DATABASE_URL = database
process.env.SCHEMA_PUSH = 'true'
process.env.PAYLOAD_SECRET = 'disposable-e2e-secret-more-than-32-characters'
process.env.PUBLIC_ORIGIN = 'http://localhost:5173'
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 60000,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  globalSetup: './tests/helpers/e2eSetup.ts',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm dev --port 3000',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NODE_OPTIONS: '--no-deprecation',
        DATABASE_URL: database,
        SCHEMA_PUSH: 'true',
        PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
        PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN,
      },
    },
    {
      command: 'pnpm --filter @rasad/panel dev',
      env: { NODE_OPTIONS: '--no-deprecation' },
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
})
