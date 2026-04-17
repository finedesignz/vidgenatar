import path from 'path'
import fs from 'fs'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path')
  if (!filePath) return new Response('Missing path', { status: 400 })

  const resolved = path.resolve(filePath)
  if (!fs.existsSync(resolved)) return new Response('Not found', { status: 404 })

  const stream = fs.createReadStream(resolved)
  const filename = path.basename(resolved)

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
