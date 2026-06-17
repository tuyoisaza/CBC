import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('admin/shipping-zones')

export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().min(1),
  baseFee: z.number().min(0),
  feePerUnit: z.number().min(0),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const items = await db.shippingZone.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json(items)
  } catch (error) {
    log.error({ path: '/api/admin/shipping-zones', method: 'GET', error }, 'Failed to fetch shipping zones')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)
    const item = await db.shippingZone.create({ data })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/admin/shipping-zones', method: 'POST', error }, 'Failed to create shipping zone')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
