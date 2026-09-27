import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'panels.e2e.spec.ts',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
  reporter: 'list',
})
