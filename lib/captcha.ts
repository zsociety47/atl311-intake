const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

type TurnstileResponse = {
  success: boolean
  'error-codes'?: string[]
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true when CAPTCHA is disabled (no secret configured) for local dev/test.
 */
export async function verifyCaptcha(token: string | undefined, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  if (!token || typeof token !== 'string' || !token.trim()) {
    return false
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  })
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = (await res.json()) as TurnstileResponse
    return data.success === true
  } catch (err) {
    console.error('Turnstile verification error:', err)
    return false
  }
}

export function isCaptchaRequired(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY)
}
