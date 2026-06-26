import { db, withDbRetry } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
const log = createLogger('api/extras')

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const extras = await withDbRetry(() =>
      db.extra.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
      }),
    )
    return NextResponse.json(extras)
  } catch (error) {
    log.error({ path: '/api/extras', method: 'GET', error }, 'Failed to fetch extras')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
