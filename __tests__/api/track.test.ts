/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  db: {
    case: {
      findUnique: jest.fn(),
    },
  },
}))

import { GET } from '@/app/api/track/[ticketId]/route'
import { db } from '@/lib/db'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

const mockFindUnique = db.case.findUnique as jest.Mock
const mockCheckRateLimit = checkRateLimit as jest.Mock
const mockRateLimitResponse = rateLimitResponse as jest.Mock

const SAMPLE_CASE = {
  publicId: 'ABCDEF',
  category: 'DOT',
  address: '100 Auburn Ave, Atlanta, GA 30303',
  status: 'ROUTED',
  sanitizedDescription: 'Large pothole on the corner.',
  createdAt: new Date('2026-06-24T09:00:00Z'),
  routings: [
    {
      department: 'DOT',
      decisionSource: 'CLAUDE',
      confidence: 0.95,
      reasoningSummary: 'Road damage issue.',
      createdAt: new Date('2026-06-24T10:00:00Z'),
    },
  ],
  statusHistory: [
    {
      fromStatus: null,
      toStatus: 'SUBMITTED',
      note: null,
      createdAt: new Date('2026-06-24T09:00:00Z'),
    },
    {
      fromStatus: 'SUBMITTED',
      toStatus: 'ROUTED',
      note: null,
      createdAt: new Date('2026-06-24T10:00:00Z'),
    },
  ],
}

function makeRequest(ticketId: string): NextRequest {
  return new NextRequest(`http://localhost/api/track/${ticketId}`)
}

function makeParams(ticketId: string): { params: Promise<{ ticketId: string }> } {
  return { params: Promise.resolve({ ticketId }) }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCheckRateLimit.mockResolvedValue({ allowed: true })
})

describe('GET /api/track/[ticketId]', () => {
  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 })
    mockRateLimitResponse.mockReturnValue(
      Response.json({ error: 'Too many requests' }, { status: 429 }),
    )

    const res = await GET(makeRequest('ABCDEF'), makeParams('ABCDEF'))

    expect(res.status).toBe(429)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns case details for a valid ticket ID', async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_CASE)

    const res = await GET(makeRequest('abcdef'), makeParams('abcdef'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.publicId).toBe('ABCDEF')
    expect(json.status).toBe('ROUTED')
    expect(json.routingHistory).toHaveLength(1)
    expect(json.routingHistory[0].confidence).toBe(0.95)
    expect(json.statusTimeline).toHaveLength(2)
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicId: 'ABCDEF' },
      }),
    )
  })

  it('returns 404 when ticket ID is not found', async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await GET(makeRequest('ZZZZZZ'), makeParams('ZZZZZZ'))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Case not found')
  })

  it('normalizes ticket ID to uppercase before lookup', async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_CASE)

    await GET(makeRequest('  abcdef  '), makeParams('  abcdef  '))

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicId: 'ABCDEF' },
      }),
    )
  })

  it('handles null confidence in routing history', async () => {
    mockFindUnique.mockResolvedValue({
      ...SAMPLE_CASE,
      routings: [{ ...SAMPLE_CASE.routings[0], confidence: null }],
    })

    const res = await GET(makeRequest('ABCDEF'), makeParams('ABCDEF'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.routingHistory[0].confidence).toBeNull()
  })
})
