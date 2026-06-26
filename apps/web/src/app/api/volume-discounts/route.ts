import { db, withDbRetry } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
const log = createLogger('api/volume-discounts')

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const discounts = await withDbRetry(() =>
      db.volumeDiscount.findMany({
        orderBy: { minQty: 'asc' },
      }),
    )
    return NextResponse.json(discounts)
  } catch (error) {
    log.error({ path: '/api/volume-discounts', method: 'GET', error }, 'Failed to fetch volume discounts')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
