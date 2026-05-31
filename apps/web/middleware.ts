import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

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

export default function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl

  // ── Static assets / Next internals — always pass through ──────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    /\.(.*)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // ── Public routes — no auth required ──────────────────────────────────────
  const publicRoutes = [
    '/',
    '/login',
    '/en',
    '/cotizar',
    '/tracking',
    '/api',
  ]
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // ── All other routes require auth ─────────────────────────────────────────
  return (authMiddleware as any)(req)
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
