import createMiddleware from 'next-intl/middleware'
import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './src/i18n/routing'

const intlMiddleware = createMiddleware(routing)

const authMiddleware = withAuth(
  function onSuccess(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => token?.role === 'admin',
    },
    pages: {
      signIn: '/admin/login',
    },
  }
)

export default function middleware(req: NextRequest) {
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')
  const isAdminLogin = req.nextUrl.pathname === '/admin/login'

  // Admin login page — no auth required
  if (isAdminLogin) return NextResponse.next()

  // Admin routes — require auth
  if (isAdminRoute) {
    return (authMiddleware as any)(req)
  }

  // API routes — pass through (each route handles its own auth/verification)
  if (isApiRoute) return NextResponse.next()

  // Public routes — i18n routing
  return intlMiddleware(req)
}

export const config = {
  matcher: [
    // i18n: match all public pages except _next, api, static
    '/((?!_next|_vercel|.*\\..*).*)',
    // Admin
    '/admin/:path*',
  ],
}
