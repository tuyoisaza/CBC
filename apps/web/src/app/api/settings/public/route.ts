import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PUBLIC_KEYS = ['MIN_PRODUCTION_DAYS', 'RUSH_DAYS_THRESHOLD', 'RUSH_FEE_PCT', 'ADVANCE_PCT', 'MIN_QTY_PER_METHOD']

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    })
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
    return NextResponse.json(map)
  } catch (error) {
    console.error('GET /api/settings/public error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
