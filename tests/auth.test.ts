import { authenticate } from '@/lib/auth'
import { db } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  db: { client: { findUnique: jest.fn() } },
}))

const mockDb = db as unknown as { client: { findUnique: jest.Mock } }

beforeEach(() => jest.clearAllMocks())

test('returns admin context for ADMIN_API_KEY', async () => {
  process.env.ADMIN_API_KEY = 'admin-secret'
  const req = new Request('http://localhost', {
    headers: { authorization: 'Bearer admin-secret' },
  })
  const ctx = await authenticate(req)
  expect(ctx).toEqual({ type: 'admin' })
})

test('returns client context for valid client api key', async () => {
  mockDb.client.findUnique.mockResolvedValue({ id: 'client-1' })
  const req = new Request('http://localhost', {
    headers: { authorization: 'Bearer client-key' },
  })
  const ctx = await authenticate(req)
  expect(ctx).toEqual({ type: 'client', clientId: 'client-1' })
})

test('returns null for missing token', async () => {
  const req = new Request('http://localhost')
  const ctx = await authenticate(req)
  expect(ctx).toBeNull()
})

test('returns null for invalid token', async () => {
  mockDb.client.findUnique.mockResolvedValue(null)
  const req = new Request('http://localhost', {
    headers: { authorization: 'Bearer bad-token' },
  })
  const ctx = await authenticate(req)
  expect(ctx).toBeNull()
})
