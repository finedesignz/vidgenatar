import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import type { AuthContext } from '@/lib/types'

// ── API auth (existing) ────────────────────────────────────────────────────

export async function authenticate(req: Request): Promise<AuthContext | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  if (token === process.env.ADMIN_API_KEY) return { type: 'admin' }

  const client = await db.client.findUnique({ where: { apiKey: token } })
  if (client) return { type: 'client', clientId: client.id }

  return null
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

// ── Session auth (magic-link login) ───────────────────────────────────────

const SESSION_COOKIE = 'vg_session'
const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days
const MAGIC_LINK_TTL = 60 * 15 // 15 minutes

export interface SessionPayload {
  email: string
}

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET is not set')
  return new TextEncoder().encode(s)
}

export async function createMagicLinkToken(email: string): Promise<string> {
  return new SignJWT({ email, purpose: 'magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAGIC_LINK_TTL}s`)
    .sign(getSecret())
}

export async function verifyMagicLinkToken(token: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.purpose !== 'magic-link' || typeof payload.email !== 'string') return null
    return { email: payload.email }
  } catch {
    return null
  }
}

export async function createSession(data: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL,
    path: '/',
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, getSecret())
    return { email: payload.email as string }
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
