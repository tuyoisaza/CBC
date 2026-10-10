import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { getAnalyticsSettings } from '@/lib/analytics-settings'

const log = createLogger('api/settings/analytics')

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await getAnalyticsSettings(), {
      headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch {
    log.error({ path: '/api/settings/analytics', method: 'GET' }, 'Failed to fetch analytics settings')
    return NextResponse.json({ error: 'No se pudo consultar la configuración de medición.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' },
    })
  }
}
