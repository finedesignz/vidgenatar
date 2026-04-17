import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()
  const voices = await db.voice.findMany({ orderBy: { name: 'asc' } })
  return Response.json(voices)
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx || ctx.type !== 'admin') return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = z.object({
    elevenlabs_voice_id: z.string(),
    name: z.string(),
    settings: z.record(z.string(), z.unknown()).optional(),
  }).safeParse(body)

  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  const { elevenlabs_voice_id, name, settings } = parsed.data

  const voice = await db.voice.upsert({
    where: { elevenlabsVoiceId: elevenlabs_voice_id },
    create: { elevenlabsVoiceId: elevenlabs_voice_id, name, settings: (settings ?? {}) as object },
    update: { name, settings: (settings ?? {}) as object },
  })
  return Response.json(voice, { status: 201 })
}
