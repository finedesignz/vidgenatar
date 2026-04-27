export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createMagicLinkToken } from '@/lib/auth'
import { registerNonce } from '@/lib/nonce'
import { sendMagicLinkEmail } from '@/lib/email'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(email: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(email)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 10 * 60 * 1000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!checkRateLimit(email)) {
      return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 })
    }

    const token = await createMagicLinkToken(email)
    await registerNonce(token)

    const host = req.headers.get('host') ?? 'localhost'
    const proto = req.headers.get('x-forwarded-proto') ?? 'http'
    const magicLinkUrl = `${proto}://${host}/api/auth/verify?token=${encodeURIComponent(token)}`

    await sendMagicLinkEmail(email, magicLinkUrl)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-magic-link]', err)
    return NextResponse.json({ error: 'Failed to send magic link. Please try again.' }, { status: 500 })
  }
}
