import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC = ['/login', '/api/auth/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some((p) => pathname.startsWith(p)) || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    const res = NextResponse.next()
    res.headers.set('x-pathname', pathname)
    return res
  }

  const sessionToken = req.cookies.get('vg_session')?.value
  if (!sessionToken) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const secret = process.env.SESSION_SECRET
  if (!secret) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    const res = NextResponse.redirect(url)
    res.cookies.delete('vg_session')
    return res
  }

  try {
    await jwtVerify(sessionToken, new TextEncoder().encode(secret))
    const res = NextResponse.next()
    res.headers.set('x-pathname', pathname)
    return res
  } catch {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    const res = NextResponse.redirect(url)
    res.cookies.delete('vg_session')
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
