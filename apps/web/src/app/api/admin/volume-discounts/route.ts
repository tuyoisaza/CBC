import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('admin/volume-discounts')

export const dynamic = 'force-dynamic'

const schema = z.object({
  minQty: z.number().int().positive(),
  maxQty: z.number().int().positive().nullable().optional(),
  discountPct: z.number().min(0).max(100),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const items = await db.volumeDiscount.findMany({ orderBy: { minQty: 'asc' } })
    return NextResponse.json(items)
  } catch (error) {
    log.error({ path: '/api/admin/volume-discounts', method: 'GET', error }, 'Failed to fetch volume discounts')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)
    const item = await db.volumeDiscount.create({ data })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/admin/volume-discounts', method: 'POST', error }, 'Failed to create volume discount')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
