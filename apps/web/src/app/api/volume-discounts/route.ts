import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const discounts = await db.volumeDiscount.findMany({
      orderBy: { minQty: 'asc' },
    })
    return NextResponse.json(discounts)
  } catch (error) {
    console.error('GET /api/volume-discounts error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
