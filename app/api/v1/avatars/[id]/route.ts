export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()
  const { id } = await params
  await db.avatar.delete({ where: { id } })
  return Response.json({ ok: true })
}
