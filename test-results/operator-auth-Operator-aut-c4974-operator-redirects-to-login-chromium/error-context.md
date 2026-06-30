# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: operator-auth.spec.ts >> Operator authentication >> unauthenticated access to /operator redirects to login
- Location: e2e/operator-auth.spec.ts:7:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/operator\/login/
Received string:  "https://atl311-intake.vercel.app/operator"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "https://atl311-intake.vercel.app/operator"

```

```yaml
- paragraph: An official website of the City of Atlanta
- banner:
  - paragraph: ATL311 Operator Dashboard
  - paragraph: Review AI routing decisions and take action.
- main:
  - region "Dashboard metrics":
    - paragraph: Open Cases
    - paragraph: "0"
    - paragraph: Claude Routed
    - paragraph: "1"
    - paragraph: Low Confidence
    - paragraph: "1"
    - paragraph: below 70%
    - paragraph: Manual Overrides
    - paragraph: "1"
    - paragraph: Claude Accuracy
    - paragraph: 50%
  - region "Case list":
    - heading "All Cases(2)" [level=2]
    - text: "#64E363 Approved"
    - paragraph: ysutfsu
    - paragraph: dsdsvdsds
    - paragraph: 14h ago
    - paragraph: PARKS
    - paragraph: Complaint
    - paragraph: dfsvdfvfdsvfdvfdvfdvfd
    - paragraph: Routed to
    - text: MANUAL
    - paragraph: Transportation
    - paragraph: dscdscdscds
    - text: "#AF0A6F Approved"
    - paragraph: Teeter
    - paragraph: Erette
    - paragraph: 17h ago
    - paragraph: SUPPORTIVE_SERVICES
    - paragraph: Complaint
    - paragraph: sssssssssssssssssssssss
    - paragraph: Routed to
    - text: CLAUDE
    - paragraph: Other
    - paragraph: The description contains no intelligible information, making it impossible to determine a valid department routing.
    - paragraph: 20%
    - paragraph: Confidence
- contentinfo:
  - paragraph: An official City of Atlanta service · Contact us at 311 · Privacy
- alert
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
> 9  |     await expect(page).toHaveURL(/\/operator\/login/)
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  10 |   })
  11 | 
  12 |   test('wrong password shows Invalid credentials error', async ({ page }) => {
  13 |     await page.goto('/operator/login')
  14 |     await page.fill('#email', 'wrong@example.com')
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