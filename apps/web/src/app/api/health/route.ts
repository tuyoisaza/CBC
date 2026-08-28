import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const startedAt = Date.now()

/**
 * Liveness probe used by Railway (`healthcheckPath: /api/health`).
 *
 * Deliberately imports nothing from the DB or external services: it must
 * respond 2xx fast and deterministically even while Postgres is still
 * warming up, otherwise Railway would consider the freshly-deployed
 * instance unhealthy and restart it. Use `/api/health/deep` (auth-guarded)
 * to exercise the database and integration checks on demand.
 */
export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'cbc-web',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '?',
      environment: process.env.NODE_ENV || 'development',
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  )
}
