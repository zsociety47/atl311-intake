import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Load .env so OPERATOR_EMAIL / OPERATOR_PASSWORD are available to tests
// without requiring the caller to manually source the file.
config({ path: '.env' })

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
