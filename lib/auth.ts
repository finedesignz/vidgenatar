import { db } from '@/lib/db'
import type { AuthContext } from '@/lib/types'

export async function authenticate(req: Request): Promise<AuthContext | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  if (token === process.env.ADMIN_API_KEY) return { type: 'admin' }

  const client = await db.client.findUnique({ where: { apiKey: token } })
  if (client) return { type: 'client', clientId: client.id }

  return null
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
