import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isEngineRequest } from '@/lib/engine-auth'
import { z } from 'zod'

// Approval-flow transitions: scheduled → published (approved) | draft (discarded)
// | failed (publish error)
const patchSchema = z.object({
  status:         z.enum(['draft', 'scheduled', 'published', 'failed']).optional(),
  platformPostId: z.string().optional(),
  errorMsg:       z.string().optional(),
  caption:        z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session && !isEngineRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const data = patchSchema.parse(body)

  const post = await db.post.update({
    where: { id: params.id },
    data: {
      ...data,
      ...(data.status === 'published' ? { publishedAt: new Date() } : {}),
    },
  })

  return NextResponse.json(post)
}
