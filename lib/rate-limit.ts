import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export type RateLimitTier = 'submit' | 'track' | 'auth'

const TIER_LIMITS: Record<RateLimitTier, { requests: number; window: `${number} s` | `${number} m` }> = {
  submit: { requests: 5, window: '60 s' },
  track: { requests: 20, window: '60 s' },
  auth: { requests: 10, window: '60 s' },
}

const limiters = new Map<RateLimitTier, Ratelimit>()

function getLimiter(tier: RateLimitTier): Ratelimit | null {
  // Vercel Upstash integration injects KV_REST_API_*; manual setup uses UPSTASH_REDIS_*.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return null

  let limiter = limiters.get(tier)
  if (!limiter) {
    const { requests, window } = TIER_LIMITS[tier]
    limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `atl311:${tier}`,
    })
    limiters.set(tier, limiter)
  }
  return limiter
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return request.headers.get('x-real-ip') ?? 'unknown'
}

type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }

/**
 * Returns whether the request is within rate limits for the given tier.
 * Skips limiting in test env or when Upstash is not configured (local dev).
 */
export async function checkRateLimit(
  request: NextRequest,
  tier: RateLimitTier,
): Promise<RateLimitResult> {
  if (process.env.NODE_ENV === 'test') return { allowed: true }

  const limiter = getLimiter(tier)
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`Rate limiting skipped: UPSTASH_REDIS_* not configured for tier ${tier}`)
    }
    return { allowed: true }
  }

  const ip = getClientIp(request)
  const { success, reset } = await limiter.limit(ip)

  if (success) return { allowed: true }

  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  return { allowed: false, retryAfterSeconds }
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    },
  )
}
