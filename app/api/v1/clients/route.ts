export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()
  const clients = await db.client.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { jobs: true } } },
  })
  return Response.json(clients)
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    brand_defaults: z.record(z.string(), z.unknown()).optional(),
  }).safeParse(body)

  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  const { name, slug, brand_defaults } = parsed.data

  const client = await db.client.create({
    data: { name, slug, brandDefaults: brand_defaults !== undefined ? brand_defaults as Prisma.InputJsonValue : Prisma.DbNull },
  })
  return Response.json(client, { status: 201 })
}
