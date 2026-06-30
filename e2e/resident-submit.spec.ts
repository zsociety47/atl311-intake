import { test, expect } from '@playwright/test'

test.describe('Resident intake form', () => {
  test('submits a four-step form and receives a ticket ID', async ({ page }) => {
    await page.goto('/')

    // ── Step 1: Contact info ────────────────────────────────────────────────────
    await page.fill('#residentName', 'Jane Smith')
    await page.fill('#residentEmail', 'jane@e2e-test.com')
    await page.click('button:has-text("Next")')

    // ── Step 2: Property details ────────────────────────────────────────────────
    // Public Property is selected by default
    await page.fill('#address', '100 Auburn Ave NE, Atlanta, GA 30312')
    await page.click('button:has-text("Next")')

    // ── Step 3: Issue description ───────────────────────────────────────────────
    await page.selectOption('#category', 'DOT')
    await page.fill(
      '#description',
      'Large pothole at the intersection causing repeated tire damage to vehicles.',
    )
    await page.click('button:has-text("Next")')

    // ── Step 4: Review ──────────────────────────────────────────────────────────
    await expect(page.getByText('Jane Smith')).toBeVisible()
    await expect(page.getByText('jane@e2e-test.com')).toBeVisible()
    await expect(page.getByText('100 Auburn Ave NE, Atlanta, GA 30312')).toBeVisible()

    // Submit — Claude routing can take a few seconds
    await page.click('button:has-text("Submit Request")')

    // ── Confirmation screen ─────────────────────────────────────────────────────
    await expect(page.getByText('Request Submitted')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('48–72 hours')).toBeVisible()

    // Ticket ID is a 6-character uppercase alphanumeric string
    const ticketText = await page.locator('p.font-mono.font-bold').textContent()
    expect(ticketText).toMatch(/^[A-Z0-9]{6}$/)
  })

  test('track page shows case status after submission', async ({ page }) => {
    await page.goto('/')
    await page.fill('#residentName', 'Track Tester')
    await page.fill('#residentEmail', 'track@e2e-test.com')
    await page.click('button:has-text("Next")')
    await page.fill('#address', '55 Trinity Ave SW, Atlanta, GA 30303')
    await page.click('button:has-text("Next")')
    await page.selectOption('#category', 'DOT')
    await page.fill('#description', 'Cracked sidewalk near city hall entrance creating a tripping hazard.')
    await page.click('button:has-text("Next")')
    await page.click('button:has-text("Submit Request")')
    await expect(page.getByText('Request Submitted')).toBeVisible({ timeout: 20_000 })
    const ticketId = await page.locator('p.font-mono.font-bold').textContent()
    expect(ticketId).toMatch(/^[A-Z0-9]{6}$/)

    await page.goto(`/track?id=${ticketId}`)
    await expect(page.getByText(ticketId!)).toBeVisible()
    await expect(page.getByText('Routed')).toBeVisible()
    await expect(page.getByText('Routed to')).toBeVisible()
  })

  test('shows inline error when both email and phone are blank', async ({ page }) => {
    await page.goto('/')
    await page.fill('#residentName', 'Test User')
    // Leave email and phone blank
    await page.click('button:has-text("Next")')
    await expect(
      page.getByText('Provide at least an email address or phone number'),
    ).toBeVisible()
  })
})
