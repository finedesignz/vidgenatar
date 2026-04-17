import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()
  const templates = await db.template.findMany({ orderBy: { name: 'asc' } })
  return Response.json(templates)
}
