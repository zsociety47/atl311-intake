/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn((config: unknown) => config),
}))

import { getServerSession } from 'next-auth'
import { authOptions, getOperatorSession } from '@/lib/auth'

const mockGetServerSession = getServerSession as jest.Mock

const credentialsProvider = authOptions.providers[0] as {
  authorize: (credentials: Record<string, string> | undefined) => Promise<unknown>
}

describe('authOptions.authorize', () => {
  const originalEmail = process.env.OPERATOR_EMAIL
  const originalPassword = process.env.OPERATOR_PASSWORD

  beforeEach(() => {
    process.env.OPERATOR_EMAIL = 'operator@atl311.gov'
    process.env.OPERATOR_PASSWORD = 'correct-password'
  })

  afterEach(() => {
    process.env.OPERATOR_EMAIL = originalEmail
    process.env.OPERATOR_PASSWORD = originalPassword
  })

  it('returns operator user when credentials match env vars', async () => {
    const user = await credentialsProvider.authorize({
      email: 'operator@atl311.gov',
      password: 'correct-password',
    })

    expect(user).toEqual({
      id: '1',
      name: 'Operator',
      email: 'operator@atl311.gov',
      role: 'operator',
    })
  })

  it('returns null when password is wrong', async () => {
    const user = await credentialsProvider.authorize({
      email: 'operator@atl311.gov',
      password: 'wrong-password',
    })

    expect(user).toBeNull()
  })

  it('returns null when env vars are not configured', async () => {
    delete process.env.OPERATOR_EMAIL
    delete process.env.OPERATOR_PASSWORD

    const user = await credentialsProvider.authorize({
      email: '',
      password: '',
    })

    expect(user).toBeNull()
  })
})

describe('authOptions callbacks', () => {
  it('jwt callback copies role from user onto token', () => {
    const token = {}
    const result = authOptions.callbacks!.jwt!({
      token,
      user: { id: '1', role: 'operator' },
    })

    expect(result.role).toBe('operator')
  })

  it('session callback copies role from token onto session', () => {
    const session = { user: { name: 'Operator', email: 'operator@atl311.gov' } }
    const result = authOptions.callbacks!.session!({
      session,
      token: { role: 'operator' },
    })

    expect(result.user.role).toBe('operator')
  })
})

describe('getOperatorSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns session when user has operator role', async () => {
    const session = { user: { role: 'operator', email: 'operator@atl311.gov' } }
    mockGetServerSession.mockResolvedValue(session)

    await expect(getOperatorSession()).resolves.toBe(session)
  })

  it('returns null when there is no session', async () => {
    mockGetServerSession.mockResolvedValue(null)

    await expect(getOperatorSession()).resolves.toBeNull()
  })

  it('returns null when role is not operator', async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: 'admin' } })

    await expect(getOperatorSession()).resolves.toBeNull()
  })
})
