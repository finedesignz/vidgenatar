export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLinkToken, createSession } from '@/lib/auth'
import { consumeNonce } from '@/lib/nonce'

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') ?? ''

  if (!token) return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))

  const payload = await verifyMagicLinkToken(token)
  if (!payload) return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))

  const ok = await consumeNonce(token)
  if (!ok) return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))

  await createSession({ email: payload.email })
  return NextResponse.redirect(new URL('/', req.url))
}
