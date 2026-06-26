import { db, withDbRetry } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
const log = createLogger('api/shipping-zones')

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const zones = await withDbRetry(() =>
      db.shippingZone.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
      }),
    )
    return NextResponse.json(zones)
  } catch (error) {
    log.error({ path: '/api/shipping-zones', method: 'GET', error }, 'Failed to fetch shipping zones')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
