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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.partial().parse(body)
    const item = await db.shippingZone.update({ where: { id: params.id }, data })
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/admin/shipping-zones/[id]', method: 'PATCH', id: params.id, error }, 'Failed to update shipping zone')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await db.shippingZone.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ path: '/api/admin/shipping-zones/[id]', method: 'DELETE', id: params.id, error }, 'Failed to delete shipping zone')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
