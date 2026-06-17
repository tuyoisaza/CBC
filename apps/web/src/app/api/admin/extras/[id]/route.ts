import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('admin/extras')

export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  unitPrice: z.number().positive(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.partial().parse(body)
    const item = await db.extra.update({ where: { id: params.id }, data })
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/admin/extras/[id]', method: 'PATCH', id: params.id, error }, 'Failed to update extra')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await db.extra.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    log.error({ path: '/api/admin/extras/[id]', method: 'DELETE', id: params.id, error }, 'Failed to delete extra')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
