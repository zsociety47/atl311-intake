/**
 * @jest-environment node
 */
const mockSend = jest.fn().mockResolvedValue({ id: 'email-1' })

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

import { sendSubmissionConfirmation, sendCaseClosedNotification } from '@/lib/email'

beforeEach(() => {
  mockSend.mockClear()
  process.env.RESEND_API_KEY = 're_test_key'
  process.env.RESEND_FROM_EMAIL = 'noreply@atl311.gov'
})

describe('sendSubmissionConfirmation', () => {
  it('sends confirmation email with department label and ticket ID', async () => {
    await sendSubmissionConfirmation('jane@example.com', {
      ticketId: 'ABC123',
      department: 'DOT',
    })

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@atl311.gov',
        to: ['jane@example.com'],
        subject: 'Your ATL311 request has been received — #ABC123',
        html: expect.stringContaining('Transportation'),
      }),
    )
    expect(mockSend.mock.calls[0][0].html).toContain('ABC123')
  })

  it('falls back to formatted department name for unknown departments', async () => {
    await sendSubmissionConfirmation('jane@example.com', {
      ticketId: 'ABC123',
      department: 'CUSTOM_DEPT',
    })

    expect(mockSend.mock.calls[0][0].html).toContain('CUSTOM DEPT')
  })
})

describe('sendCaseClosedNotification', () => {
  it('sends closure email with category label and resubmit link', async () => {
    await sendCaseClosedNotification('jane@example.com', {
      ticketId: 'ABC123',
      category: 'DUPLICATE',
      description: 'This request was already filed under ticket 7615EB.',
    })

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['jane@example.com'],
        subject: 'Update on your ATL311 request #ABC123',
        html: expect.stringContaining('duplicate of an existing request'),
      }),
    )
    expect(mockSend.mock.calls[0][0].html).toContain('Resubmit a request')
    expect(mockSend.mock.calls[0][0].html).toMatch(/href="[^"]+"[^>]*>\s*\n?\s*Resubmit a request/)
  })

  it('falls back to formatted category for unknown close categories', async () => {
    await sendCaseClosedNotification('jane@example.com', {
      ticketId: 'ABC123',
      category: 'CUSTOM_REASON',
      description: 'Closed for review.',
    })

    expect(mockSend.mock.calls[0][0].html).toContain('CUSTOM REASON')
  })

  it('escapes HTML in operator close description', async () => {
    await sendCaseClosedNotification('jane@example.com', {
      ticketId: 'ABC123',
      category: 'OTHER',
      description: '<script>alert("xss")</script>',
    })

    const html = mockSend.mock.calls[0][0].html as string
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>alert')
  })
})
