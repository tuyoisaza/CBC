import { db, withDbRetry } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
const log = createLogger('api/settings/public')

export const dynamic = 'force-dynamic'

const PUBLIC_KEYS = ['MIN_PRODUCTION_DAYS', 'RUSH_DAYS_THRESHOLD', 'RUSH_FEE_PCT', 'ADVANCE_PCT', 'MIN_QTY_PER_METHOD']

export async function GET() {
  try {
    const settings = await withDbRetry(() =>
      db.setting.findMany({
        where: { key: { in: PUBLIC_KEYS } },
      }),
    )
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
    return NextResponse.json(map)
  } catch (error) {
    log.error({ path: '/api/settings/public', method: 'GET', error }, 'Failed to fetch public settings')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
