export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    url: z.string().url(),
    client_id: z.string().uuid().optional(),
  }).safeParse(body)

  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const clientId = ctx.type === 'client' ? ctx.clientId : (parsed.data.client_id ?? null)
  const webhook = await db.webhook.create({ data: { url: parsed.data.url, clientId } })
  return Response.json(webhook, { status: 201 })
}
