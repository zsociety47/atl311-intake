/**
 * @jest-environment node
 */
import { verifyCaptcha, isCaptchaRequired } from '@/lib/captcha'

const originalEnv = process.env
const mockFetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...originalEnv }
  global.fetch = mockFetch
})

afterAll(() => {
  process.env = originalEnv
})

describe('isCaptchaRequired', () => {
  it('returns true when TURNSTILE_SECRET_KEY is set', () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    expect(isCaptchaRequired()).toBe(true)
  })

  it('returns false when TURNSTILE_SECRET_KEY is unset', () => {
    delete process.env.TURNSTILE_SECRET_KEY
    expect(isCaptchaRequired()).toBe(false)
  })
})

describe('verifyCaptcha', () => {
  it('returns true in non-production when secret is not configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    process.env.NODE_ENV = 'development'
    await expect(verifyCaptcha(undefined)).resolves.toBe(true)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns false when secret is configured but token is missing', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    await expect(verifyCaptcha(undefined)).resolves.toBe(false)
  })

  it('returns true when Turnstile API confirms the token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    mockFetch.mockResolvedValue({
      json: async () => ({ success: true }),
    })

    await expect(verifyCaptcha('valid-token', '127.0.0.1')).resolves.toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('returns false when Turnstile API rejects the token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    mockFetch.mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    })

    await expect(verifyCaptcha('bad-token')).resolves.toBe(false)
  })
})
