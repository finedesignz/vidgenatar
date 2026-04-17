export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { authenticate, unauthorized } from '@/lib/auth'
import { listVoices } from '@/services/elevenlabs'

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()
  const voices = await listVoices()
  return Response.json({ available: voices })
}
