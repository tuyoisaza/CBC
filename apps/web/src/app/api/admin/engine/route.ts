import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEngineHealth, triggerPost, previewPost } from '@/lib/engine'
import { z } from 'zod'

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('health') }),
  z.object({ action: z.literal('preview'), type: z.string() }),
  z.object({
    action:    z.literal('publish'),
    type:      z.string(),
    platforms: z.array(z.string()),
    caption:   z.string().optional(),
    imageUrl:  z.string().optional(),
  }),
])

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const health = await getEngineHealth()
  return NextResponse.json(health)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = actionSchema.parse(body)

  switch (data.action) {
    case 'health': {
      return NextResponse.json(await getEngineHealth())
    }

    case 'preview': {
      const preview = await previewPost(data.type)
      return NextResponse.json(preview)
    }

    case 'publish': {
      // The engine now owns Post writeback — /trigger saves the actual
      // published caption/image per platform. Saving here too would
      // double-insert (and record the stale preview instead of what shipped).
      const result = await triggerPost(data.type as any)
      return NextResponse.json({ success: true, result })
    }
  }
}
