import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()
  const avatars = await db.avatar.findMany({ orderBy: { name: 'asc' } })
  return Response.json(avatars)
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    heygen_avatar_id: z.string(),
    name: z.string(),
    style: z.string().optional(),
    thumbnail_url: z.string().optional(),
  }).safeParse(body)

  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  const { heygen_avatar_id, name, style, thumbnail_url } = parsed.data

  const avatar = await db.avatar.upsert({
    where: { heygenAvatarId: heygen_avatar_id },
    create: { heygenAvatarId: heygen_avatar_id, name, style: style ?? null, thumbnailUrl: thumbnail_url ?? null },
    update: { name, style: style ?? null, thumbnailUrl: thumbnail_url ?? null },
  })
  return Response.json(avatar, { status: 201 })
}
