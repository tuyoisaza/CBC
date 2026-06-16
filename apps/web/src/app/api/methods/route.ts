import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const methods = await db.method.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(methods)
  } catch (error) {
    console.error('GET /api/methods error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
