import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const patchSchema = z.object({
  status:   z.enum(['new', 'contacted', 'quoted', 'confirmed', 'lost']).optional(),
  notes:    z.string().optional(),
  archived: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { archived, ...rest } = patchSchema.parse(body)

  const lead = await db.lead.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(archived !== undefined && { archivedAt: archived ? new Date() : null }),
    },
  })

  return NextResponse.json(lead)
}
