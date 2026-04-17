import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()
  const { id } = await params
  const template = await db.template.findUnique({ where: { id } })
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(template)
}
