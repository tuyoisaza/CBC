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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.partial().parse(body)
    const item = await db.volumeDiscount.update({ where: { id: params.id }, data })
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/admin/volume-discounts/[id]', method: 'PATCH', id: params.id, error }, 'Failed to update volume discount')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await db.volumeDiscount.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ path: '/api/admin/volume-discounts/[id]', method: 'DELETE', id: params.id, error }, 'Failed to delete volume discount')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
