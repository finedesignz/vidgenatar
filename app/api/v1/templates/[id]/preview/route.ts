import path from 'path'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, unauthorized } from '@/lib/auth'
import { renderTemplate } from '@/worker/stages/remotion-render'

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? './output'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticate(req)
  if (!ctx) return unauthorized()

  const { id } = await params
  const template = await db.template.findUnique({ where: { id } })
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const props = { ...(template.defaultProps as Record<string, unknown>), ...body }

  const outputPath = path.join(OUTPUT_DIR, 'background', `preview-${template.compositionId}-${Date.now()}.mp4`)
  await renderTemplate(template.compositionId, props, outputPath)

  return Response.json({ preview_path: outputPath })
}
