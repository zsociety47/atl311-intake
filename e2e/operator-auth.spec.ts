import { test, expect } from '@playwright/test'

const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL ?? ''
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD ?? ''

test.describe('Operator authentication', () => {
  test('unauthenticated access to /operator redirects to login', async ({ page }) => {
    await page.goto('/operator')
    await expect(page).toHaveURL(/\/operator\/login/)
  })

  test('wrong password shows Invalid credentials error', async ({ page }) => {
    await page.goto('/operator/login')
    await page.fill('#email', 'wrong@example.com')
    await page.fill('#password', 'wrongpassword')
    await page.click('button:has-text("Sign In")')
    await expect(page.getByRole('alert')).toContainText('Invalid credentials')
  })

  test('correct credentials redirect to operator dashboard', async ({ page }) => {
    await page.goto('/operator/login')
    await page.fill('#email', OPERATOR_EMAIL)
    await page.fill('#password', OPERATOR_PASSWORD)
    await page.click('button:has-text("Sign In")')
    await expect(page).toHaveURL(/\/operator$/, { timeout: 10_000 })
    await expect(page.getByText('ATL311 Operator Dashboard')).toBeVisible()
  })
})
