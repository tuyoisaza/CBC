import createMiddleware from 'next-intl/middleware'
import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './src/i18n/routing'

const intlMiddleware = createMiddleware(routing)

const authMiddleware = withAuth(
  function onSuccess(_req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => token?.role === 'admin',
    },
    pages: {
      signIn: '/login',
    },
  }
)

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Static assets / Next internals — always pass through ──────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    /\.(.*)$/.test(pathname)   // any file with an extension (.ico, .png, …)
  ) {
    return NextResponse.next()
  }

  // ── Login page — no auth required (outside locale tree intentionally) ──────
  if (pathname === '/login') return NextResponse.next()

  // ── API routes — each handler manages its own auth / HMAC verification ─────
  if (pathname.startsWith('/api/')) return NextResponse.next()

  // ── Admin routes — NextAuth guards these ──────────────────────────────────
  if (pathname.startsWith('/admin')) {
    return (authMiddleware as unknown as typeof middleware)(req)
  }

  // ── Everything else — public, i18n-routed pages ───────────────────────────
  return intlMiddleware(req)
}

export const config = {
  // Match every path except static files handled above
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
