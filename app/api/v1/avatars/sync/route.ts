export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'
import { listAvatars } from '@/services/heygen'

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const heygenAvatars = await listAvatars()
  let upserted = 0

  for (const a of heygenAvatars) {
    await db.avatar.upsert({
      where: { heygenAvatarId: a.avatar_id },
      create: { heygenAvatarId: a.avatar_id, name: a.avatar_name, thumbnailUrl: a.preview_image_url },
      update: { name: a.avatar_name, thumbnailUrl: a.preview_image_url },
    })
    upserted++
  }

  return Response.json({ synced: upserted })
}
