import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
const log = createLogger('api/methods')

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const methods = await db.method.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(methods)
  } catch (error) {
    log.error({ path: '/api/methods', method: 'GET', error }, 'Failed to fetch methods')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
