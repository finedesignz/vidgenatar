export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLinkToken, createSession } from '@/lib/auth'
import { consumeNonce } from '@/lib/nonce'

function appUrl(path: string, req: NextRequest): URL {
  // Prefer public app URL env var; fall back to request host with forwarded proto
  const base = process.env.NEXT_PUBLIC_APP_URL
    ?? `${req.headers.get('x-forwarded-proto') ?? 'https'}://${req.headers.get('host')}`
  return new URL(path, base)
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') ?? ''

  if (!token) return NextResponse.redirect(appUrl('/login?error=invalid_token', req))

  const payload = await verifyMagicLinkToken(token)
  if (!payload) return NextResponse.redirect(appUrl('/login?error=invalid_token', req))

  const ok = await consumeNonce(token)
  if (!ok) return NextResponse.redirect(appUrl('/login?error=invalid_token', req))

  await createSession({ email: payload.email })
  return NextResponse.redirect(appUrl('/', req))
}
