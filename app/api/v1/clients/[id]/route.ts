export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()
  const { id } = await params
  const client = await db.client.findUnique({ where: { id }, include: { _count: { select: { jobs: true } } } })
  if (!client) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(client)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = z.object({
    name: z.string().optional(),
    brand_defaults: z.record(z.string(), z.unknown()).optional(),
  }).safeParse(body)

  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  const client = await db.client.update({
    where: { id },
    data: { name: parsed.data.name, brandDefaults: parsed.data.brand_defaults as object | undefined },
  })
  return Response.json(client)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()
  const { id } = await params
  await db.client.delete({ where: { id } })
  return Response.json({ ok: true })
}
