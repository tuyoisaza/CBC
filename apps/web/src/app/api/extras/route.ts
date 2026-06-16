import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const extras = await db.extra.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(extras)
  } catch (error) {
    console.error('GET /api/extras error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
