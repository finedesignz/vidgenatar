export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const { id } = await params
  const job = await db.videoJob.findUnique({
    where: { id },
    include: { client: true, avatar: true, voice: true, template: true },
  })

  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })
  if (ctx.type === 'client' && job.clientId !== ctx.clientId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json(job)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const { id } = await params
  const job = await db.videoJob.findUnique({ where: { id } })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })
  if (ctx.type === 'client' && job.clientId !== ctx.clientId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (job.status !== 'queued') {
    return Response.json({ error: 'Only queued jobs can be cancelled' }, { status: 409 })
  }

  await db.videoJob.update({ where: { id }, data: { status: 'failed', errorMessage: 'Cancelled' } })
  return Response.json({ ok: true })
}
