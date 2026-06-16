import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const zones = await db.shippingZone.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(zones)
  } catch (error) {
    console.error('GET /api/shipping-zones error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
