/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({
  db: {
    case: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/email', () => ({
  sendCaseClosedNotification: jest.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/operator/cases/route'
import { POST as approve } from '@/app/api/operator/cases/[caseId]/approve/route'
import { POST as override } from '@/app/api/operator/cases/[caseId]/override/route'
import { POST as close } from '@/app/api/operator/cases/[caseId]/close/route'
import { db } from '@/lib/db'

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

const mockFindMany = db.case.findMany as jest.Mock
const mockFindUnique = db.case.findUnique as jest.Mock
const mockTransaction = db.$transaction as jest.Mock

const SAMPLE_ROUTING = {
  id: 'routing-1',
  caseId: 'case-1',
  department: 'DOT',
  decisionSource: 'CLAUDE',
  confidence: 0.95,
  reasoningSummary: 'Pothole is a road issue.',
  createdAt: new Date('2026-06-24T10:00:00Z'),
}

const SAMPLE_CASE = {
  id: 'case-1',
  publicId: 'ABCDEF',
  residentName: 'Jane Smith',
  residentEmail: 'jane@example.com',
  address: '100 Auburn Ave, Atlanta, GA 30303',
  isPublic: true,
  ownerOrTenant: 'Public Property',
  category: 'Roads',
  description: 'Large pothole.',
  sanitizedDescription: 'Large pothole.',
  status: 'ROUTED',
  createdAt: new Date('2026-06-24T09:00:00Z'),
  updatedAt: new Date('2026-06-24T09:00:00Z'),
  routings: [SAMPLE_ROUTING],
}

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost/api/operator/cases', { method: 'GET' })
}

function makePostRequest(url: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeParams(caseId: string): { params: Promise<{ caseId: string }> } {
  return { params: Promise.resolve({ caseId }) }
}

function makeMockTx() {
  return {
    case: {
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

beforeEach(() => {
  jest.clearAllMocks()
})

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('GET /api/operator/cases', () => {
  it('returns cases with latest routing and metrics', async () => {
    mockFindMany.mockResolvedValue([SAMPLE_CASE])

    const res = await GET(makeGetRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.cases).toHaveLength(1)
    expect(json.cases[0].id).toBe('case-1')
    expect(json.cases[0].sanitizedDescription).toBe('Large pothole.')
    expect(json.cases[0].latestRouting).not.toBeNull()
    expect(json.cases[0].latestRouting.department).toBe('DOT')
    expect(json.cases[0].latestRouting.confidence).toBe(0.95)
    expect(json.cases[0].routingHistory).toHaveLength(1)
    expect(json.metrics.openCases).toBe(1)
    expect(json.metrics.claudeRoutedCases).toBe(1)
    expect(json.metrics.lowConfidenceCases).toBe(0)
    expect(json.metrics.manualOverrides).toBe(0)
    expect(json.metrics.routingAccuracyRate).toBeNull()
  })

  it('computes routingAccuracyRate when approved cases exist', async () => {
    const approvedCase = {
      ...SAMPLE_CASE,
      id: 'case-2',
      status: 'APPROVED',
      routings: [{ ...SAMPLE_ROUTING, caseId: 'case-2', decisionSource: 'CLAUDE' }],
    }
    mockFindMany.mockResolvedValue([approvedCase])

    const res = await GET(makeGetRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.metrics.routingAccuracyRate).toBe(1)
  })

  it('returns 500 on database failure', async () => {
    mockFindMany.mockRejectedValue(new Error('Connection failed'))

    const res = await GET(makeGetRequest())
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to fetch cases')
  })
})

describe('POST /api/operator/cases/[caseId]/approve', () => {
  it('updates case status and inserts one status history row', async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_CASE)
    const mockTx = makeMockTx()
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx),
    )

    const res = await approve(
      makePostRequest('http://localhost/api/operator/cases/case-1/approve'),
      makeParams('case-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.caseId).toBe('case-1')
    expect(json.status).toBe('APPROVED')
    expect(mockTx.case.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED' }),
      }),
    )
    expect(mockTx.statusHistory.create).toHaveBeenCalledTimes(1)
  })

  it('returns 404 for unknown case', async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await approve(
      makePostRequest('http://localhost/api/operator/cases/bad-id/approve'),
      makeParams('bad-id'),
    )
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Case not found')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns 500 on database failure', async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_CASE)
    mockTransaction.mockRejectedValue(new Error('Connection failed'))

    const res = await approve(
      makePostRequest('http://localhost/api/operator/cases/case-1/approve'),
      makeParams('case-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to approve case')
  })
})

describe('POST /api/operator/cases/[caseId]/override', () => {
  const VALID_BODY = { department: 'PARKS', reason: 'Better fits Parks department.' }

  it('inserts a new MANUAL Routing row and status history', async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_CASE)
    const mockTx = makeMockTx()
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx),
    )

    const res = await override(
      makePostRequest('http://localhost/api/operator/cases/case-1/override', VALID_BODY),
      makeParams('case-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.department).toBe('PARKS')
    expect(json.status).toBe('APPROVED')
    expect(mockTx.routing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ decisionSource: 'MANUAL', department: 'PARKS' }),
      }),
    )
    expect(mockTx.case.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED' }),
      }),
    )
    expect(mockTx.statusHistory.create).toHaveBeenCalledTimes(1)
  })

  it('rejects an invalid department with 400', async () => {
    const res = await override(
      makePostRequest('http://localhost/api/operator/cases/case-1/override', {
        department: 'GARBAGE_DEPT',
        reason: 'test',
      }),
      makeParams('case-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Valid department and reason are required')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('rejects an empty reason with 400', async () => {
    const res = await override(
      makePostRequest('http://localhost/api/operator/cases/case-1/override', {
        department: 'DOT',
        reason: '',
      }),
      makeParams('case-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Valid department and reason are required')
  })

  it('returns 500 on database failure', async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_CASE)
    mockTransaction.mockRejectedValue(new Error('Connection failed'))

    const res = await override(
      makePostRequest('http://localhost/api/operator/cases/case-1/override', VALID_BODY),
      makeParams('case-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to override case')
  })
})

describe('POST /api/operator/cases/[caseId]/close', () => {
  const VALID_BODY = { category: 'DUPLICATE', description: 'Already filed under ticket 7615EB.' }

  it('updates Case.status to CLOSED and inserts one StatusHistory row', async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_CASE)
    const mockTx = makeMockTx()
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx),
    )

    const res = await close(
      makePostRequest('http://localhost/api/operator/cases/case-1/close', VALID_BODY),
      makeParams('case-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.caseId).toBe('case-1')
    expect(mockTx.case.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CLOSED' }),
      }),
    )
    expect(mockTx.statusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          toStatus: 'CLOSED',
          note: JSON.stringify({ category: 'DUPLICATE', description: VALID_BODY.description }),
        }),
      }),
    )
  })

  it('rejects missing description with 400', async () => {
    const res = await close(
      makePostRequest('http://localhost/api/operator/cases/case-1/close', {
        category: 'DUPLICATE',
        description: '',
      }),
      makeParams('case-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Description is required')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('rejects invalid category with 400', async () => {
    const res = await close(
      makePostRequest('http://localhost/api/operator/cases/case-1/close', {
        category: 'GARBAGE',
        description: 'Some reason.',
      }),
      makeParams('case-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Valid close category is required')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 500 on database failure', async () => {
    mockFindUnique.mockResolvedValue(SAMPLE_CASE)
    mockTransaction.mockRejectedValue(new Error('Connection failed'))

    const res = await close(
      makePostRequest('http://localhost/api/operator/cases/case-1/close', VALID_BODY),
      makeParams('case-1'),
    )
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to close case')
  })
})
