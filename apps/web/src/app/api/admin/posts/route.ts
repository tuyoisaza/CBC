import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isEngineRequest } from '@/lib/engine-auth'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  // Also allow engine token — the engine reads history for idempotency checks
  // and the 'scheduled' approval queue
  if (!session && !isEngineRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url      = new URL(req.url)
  const platform = url.searchParams.get('platform')
  const type     = url.searchParams.get('type')
  const status   = url.searchParams.get('status')
  const limit    = parseInt(url.searchParams.get('limit') || '20')

  const posts = await db.post.findMany({
    where: {
      ...(platform ? { platform } : {}),
      ...(type ? { contentType: type } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { coffee: { select: { name: true } } },
  })

  return NextResponse.json(posts)
}

// Engine calls this to save a post: after publishing (published/failed),
// or when queuing one for human approval (scheduled)
const postSchema = z.object({
  platform:      z.string(),
  contentType:   z.string(),
  caption:       z.string(),
  imageUrl:      z.string().optional(),
  imagePrompt:   z.string().optional(),
  status:        z.enum(['published', 'failed', 'scheduled']),
  platformPostId: z.string().optional(),
  errorMsg:      z.string().optional(),
  coffeeId:      z.string().optional(),
})

export async function POST(req: NextRequest) {
  if (!isEngineRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const data = postSchema.parse(body)

  const post = await db.post.create({
    data: {
      ...data,
      publishedAt: data.status === 'published' ? new Date() : undefined,
    },
  })

  return NextResponse.json(post, { status: 201 })
}
