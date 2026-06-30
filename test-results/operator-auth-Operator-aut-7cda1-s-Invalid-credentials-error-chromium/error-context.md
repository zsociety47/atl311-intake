# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operator-auth.spec.ts >> Operator authentication >> wrong password shows Invalid credentials error
- Location: e2e/operator-auth.spec.ts:12:7

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
  6  | test.describe('Operator authentication', () => {
  7  |   test('unauthenticated access to /operator redirects to login', async ({ page }) => {
  8  |     await page.goto('/operator')
  9  |     await expect(page).toHaveURL(/\/operator\/login/)
  10 |   })
  11 | 
  12 |   test('wrong password shows Invalid credentials error', async ({ page }) => {
  13 |     await page.goto('/operator/login')
> 14 |     await page.fill('#email', 'wrong@example.com')
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  15 |     await page.fill('#password', 'wrongpassword')
  16 |     await page.click('button:has-text("Sign In")')
  17 |     await expect(page.getByRole('alert')).toContainText('Invalid credentials')
  18 |   })
  19 | 
  20 |   test('correct credentials redirect to operator dashboard', async ({ page }) => {
  21 |     await page.goto('/operator/login')
  22 |     await page.fill('#email', OPERATOR_EMAIL)
  23 |     await page.fill('#password', OPERATOR_PASSWORD)
  24 |     await page.click('button:has-text("Sign In")')
  25 |     await expect(page).toHaveURL(/\/operator$/, { timeout: 10_000 })
  26 |     await expect(page.getByText('ATL311 Operator Dashboard')).toBeVisible()
  27 |   })
  28 | })
  29 | 
```