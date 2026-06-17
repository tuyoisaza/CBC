import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('admin/methods')

export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  unitPrice: z.number().positive(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const items = await db.method.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json(items)
  } catch (error) {
    log.error({ path: '/api/admin/methods', method: 'GET', error }, 'Failed to fetch methods')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = schema.parse(body)
    const item = await db.method.create({ data })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/admin/methods', method: 'POST', error }, 'Failed to create method')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
