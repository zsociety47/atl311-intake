import { test, expect } from '@playwright/test'

const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL ?? ''
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD ?? ''

// Sign in helper reused across tests
async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/operator/login')
  await page.fill('#email', OPERATOR_EMAIL)
  await page.fill('#password', OPERATOR_PASSWORD)
  await page.click('button:has-text("Sign In")')
  await expect(page).toHaveURL(/\/operator$/, { timeout: 10_000 })
}

test.describe('Operator dashboard actions', () => {
  test('dashboard loads and displays case list after login', async ({ page }) => {
    await signIn(page)
    // Wait for the dashboard to finish loading (loading state disappears)
    await expect(page.getByText('Loading cases…')).not.toBeVisible({ timeout: 15_000 })
    // Either the empty state or the case list is shown
    const hasEmptyState = await page.getByText('No cases yet').isVisible()
    const hasCases = await page.getByText('All Cases').isVisible()
    expect(hasEmptyState || hasCases).toBe(true)
  })

  test('approves a routed case', async ({ page }) => {
    await signIn(page)

    // Wait for dashboard data to load
    await expect(page.getByText('Loading cases…')).not.toBeVisible({ timeout: 15_000 })

    // Find the first "Approve Routing" button — only shown for ROUTED cases
    const approveBtn = page.getByRole('button', { name: 'Approve Routing' }).first()

    // If no ROUTED cases exist the test is skipped gracefully
    const hasApproveBtn = await approveBtn.isVisible()
    if (!hasApproveBtn) {
      test.skip()
      return
    }

    await approveBtn.click()

    // Button disappears or case status changes — dashboard refreshes automatically
    await expect(approveBtn).not.toBeVisible({ timeout: 10_000 })
  })
})
