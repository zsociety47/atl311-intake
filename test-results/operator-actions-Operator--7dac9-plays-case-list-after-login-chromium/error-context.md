# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operator-actions.spec.ts >> Operator dashboard actions >> dashboard loads and displays case list after login
- Location: e2e/operator-actions.spec.ts:16:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#email')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "404" [level=1] [ref=e4]
    - heading "This page could not be found." [level=2] [ref=e6]
  - alert [ref=e7]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL ?? ''
  4  | const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD ?? ''
  5  | 
  6  | // Sign in helper reused across tests
  7  | async function signIn(page: import('@playwright/test').Page) {
  8  |   await page.goto('/operator/login')
> 9  |   await page.fill('#email', OPERATOR_EMAIL)
     |              ^ Error: page.fill: Test timeout of 30000ms exceeded.
  10 |   await page.fill('#password', OPERATOR_PASSWORD)
  11 |   await page.click('button:has-text("Sign In")')
  12 |   await expect(page).toHaveURL(/\/operator$/, { timeout: 10_000 })
  13 | }
  14 | 
  15 | test.describe('Operator dashboard actions', () => {
  16 |   test('dashboard loads and displays case list after login', async ({ page }) => {
  17 |     await signIn(page)
  18 |     // Wait for the dashboard to finish loading (loading state disappears)
  19 |     await expect(page.getByText('Loading cases…')).not.toBeVisible({ timeout: 15_000 })
  20 |     // Either the empty state or the case list is shown
  21 |     const hasEmptyState = await page.getByText('No cases yet').isVisible()
  22 |     const hasCases = await page.getByText('All Cases').isVisible()
  23 |     expect(hasEmptyState || hasCases).toBe(true)
  24 |   })
  25 | 
  26 |   test('approves a routed case', async ({ page }) => {
  27 |     await signIn(page)
  28 | 
  29 |     // Wait for dashboard data to load
  30 |     await expect(page.getByText('Loading cases…')).not.toBeVisible({ timeout: 15_000 })
  31 | 
  32 |     // Find the first "Approve Routing" button — only shown for ROUTED cases
  33 |     const approveBtn = page.getByRole('button', { name: 'Approve Routing' }).first()
  34 | 
  35 |     // If no ROUTED cases exist the test is skipped gracefully
  36 |     const hasApproveBtn = await approveBtn.isVisible()
  37 |     if (!hasApproveBtn) {
  38 |       test.skip()
  39 |       return
  40 |     }
  41 | 
  42 |     await approveBtn.click()
  43 | 
  44 |     // Button disappears or case status changes — dashboard refreshes automatically
  45 |     await expect(approveBtn).not.toBeVisible({ timeout: 10_000 })
  46 |   })
  47 | })
  48 | 
```