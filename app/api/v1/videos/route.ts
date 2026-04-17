import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'
import { createQueue } from '@/lib/queue'

const CreateVideoSchema = z.object({
  title: z.string().min(1),
  script: z.string().min(1),
  avatar_id: z.string().uuid(),
  voice_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  template_props: z.record(z.unknown()).optional(),
})

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') as null | 'queued' | 'processing' | 'completed' | 'failed'
  const clientId = searchParams.get('client_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (clientId) where.clientId = clientId
  if (ctx.type === 'client') where.clientId = ctx.clientId

  const [jobs, total] = await Promise.all([
    db.videoJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { client: true, avatar: true, voice: true, template: true },
    }),
    db.videoJob.count({ where }),
  ])

  return Response.json({ data: jobs, total, limit, offset })
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const body = await req.json().catch(() => null)
  const parsed = CreateVideoSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const { title, script, avatar_id, voice_id, client_id, template_id, template_props } = parsed.data
  const effectiveClientId = ctx.type === 'client' ? ctx.clientId : (client_id ?? null)

  const job = await db.videoJob.create({
    data: {
      title,
      script,
      avatarId: avatar_id,
      voiceId: voice_id,
      clientId: effectiveClientId,
      templateId: template_id ?? null,
      templateProps: template_props ?? null,
      status: 'queued',
    },
  })

  const queue = createQueue()
  await queue.add('generate', { jobId: job.id })
  await queue.close()

  return Response.json({ job_id: job.id, status: 'queued' }, { status: 201 })
}
