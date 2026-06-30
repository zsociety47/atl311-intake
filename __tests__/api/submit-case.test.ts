/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// Must be declared before any imports that use these modules.
// jest.mock calls are hoisted to the top of the file by Babel/SWC.
jest.mock('@/lib/db', () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/email', () => ({
  sendSubmissionConfirmation: jest.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/submit-case/route'
import { db } from '@/lib/db'
import { anthropic } from '@/lib/anthropic'

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

const mockTransaction = db.$transaction as jest.Mock
const mockCreate = anthropic.messages.create as jest.Mock

const VALID_BODY = {
  residentName: 'Jane Smith',
  residentEmail: 'jane@example.com',
  address: '100 Auburn Ave, Atlanta, GA 30303',
  isPublic: true,
  ownerOrTenant: 'tenant',
  category: 'DOT',
  description: 'Large pothole at the intersection causing tire damage.',
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/submit-case', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeClaudeResponse(department: string, confidence = 95) {
  return {
    content: [
      {
        type: 'tool_use',
        id: 'toolu_01',
        name: 'route_case',
        input: {
          department,
          confidence,
          reason: `Test routing decision for ${department}.`,
        },
      },
    ],
  }
}

function makeMockTx() {
  return {
    case: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    statusHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    routing: {
      create: jest.fn().mockResolvedValue({}),
    },
  }
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/submit-case', () => {
  it('happy path — valid input returns caseId, ticketId, and success message', async () => {
    mockCreate.mockResolvedValue(makeClaudeResponse('DOT'))

    const mockTx = makeMockTx()
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx),
    )

    const res = await POST(makeRequest(VALID_BODY))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(typeof json.caseId).toBe('string')
    expect(typeof json.ticketId).toBe('string')
    expect(json.ticketId).toHaveLength(6)
    expect(json.message).toContain('DOT')
    expect(mockTx.case.create).toHaveBeenCalledTimes(1)
    expect(mockTx.routing.create).toHaveBeenCalledTimes(1)
    expect(mockTx.statusHistory.create).toHaveBeenCalledTimes(2)
  })

  it('missing required field — returns 400 with error message', async () => {
    const bodyWithoutDescription = Object.fromEntries(
      Object.entries(VALID_BODY).filter(([k]) => k !== 'description'),
    )
    const res = await POST(makeRequest(bodyWithoutDescription))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('All fields are required')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('Claude returns unrecognized department — defaults to OTHER', async () => {
    mockCreate.mockResolvedValue(makeClaudeResponse('GARBAGE_DEPT', 40))

    const mockTx = makeMockTx()
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx),
    )

    const res = await POST(makeRequest(VALID_BODY))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message).toContain('OTHER')
    expect(mockTx.routing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ department: 'OTHER' }),
      }),
    )
  })

  it('Prisma transaction fails — returns 500 and does not leak a partial response', async () => {
    mockCreate.mockResolvedValue(makeClaudeResponse('WATERSHED'))
    mockTransaction.mockRejectedValue(new Error('Connection pool exhausted'))

    const res = await POST(makeRequest(VALID_BODY))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to save case')
    expect(typeof json.caseId).toBe('undefined')
  })

  it('Claude API throws — returns 503 routing service unavailable', async () => {
    mockCreate.mockRejectedValue(
      Object.assign(new Error('Request timeout'), { code: 'ETIMEDOUT' }),
    )

    const res = await POST(makeRequest(VALID_BODY))
    const json = await res.json()

    expect(res.status).toBe(503)
    expect(json.error).toBe('Routing service unavailable')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('phone-only submission — succeeds and stores phone without email', async () => {
    mockCreate.mockResolvedValue(makeClaudeResponse('DOT'))

    const mockTx = makeMockTx()
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx),
    )

    const body = { ...VALID_BODY, residentPhone: '404-555-1234' }
    delete (body as Record<string, unknown>).residentEmail

    const res = await POST(makeRequest(body))
    expect(res.status).toBe(200)
    expect(mockTx.case.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: '404-555-1234' }),
      }),
    )
  })

  it('missing both email and phone — returns 400 and does not call Claude', async () => {
    const body = { ...VALID_BODY }
    delete (body as Record<string, unknown>).residentEmail

    const res = await POST(makeRequest(body))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('All fields are required')
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
