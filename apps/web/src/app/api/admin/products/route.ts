import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
const log = createLogger('api/admin/products')

function cleanVideoUrl(url: string): string {
  let cleaned = url.trim()
  cleaned = cleaned.replace(/^[^a-zA-Z]*/, '')
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`
  }
  return cleaned
}

function sanitizeVideos(videos: { url: string; title?: string }[]) {
  return videos.map((v) => ({ ...v, url: cleanVideoUrl(v.url) }))
}

const productSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().min(1),
  price: z.number().positive(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.object({
    url: z.string().url(),
    title: z.string().optional(),
  })).optional(),
  features: z.array(z.string()),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  methodId: z.string().nullable().optional(),
})

async function checkAuth() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

function errorResponse(err: unknown) {
  if (err instanceof z.ZodError) {
    return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 422 })
  }
  const msg = err instanceof Error ? err.message : String(err)
  log.error({ error: msg }, 'Product operation failed')
  return NextResponse.json({ error: msg }, { status: 500 })
}

export async function GET() {
  const unauth = await checkAuth()
  if (unauth) return unauth

  try {
    const products = await db.product.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(products)
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  const unauth = await checkAuth()
  if (unauth) return unauth

  try {
    const body = await req.json()
    if (body.videos) body.videos = sanitizeVideos(body.videos)
    const data = productSchema.parse(body)

    const product = await db.product.create({
      data: {
        ...data,
        images: data.images ?? [],
        videos: data.videos ?? [],
        active: data.active ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function PATCH(req: NextRequest) {
  const unauth = await checkAuth()
  if (unauth) return unauth

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()
    if (body.videos) body.videos = sanitizeVideos(body.videos)
    const data = productSchema.partial().parse(body)

    const product = await db.product.update({ where: { id }, data })
    return NextResponse.json(product)
  } catch (err) {
    return errorResponse(err)
  }
}

export async function DELETE(req: NextRequest) {
  const unauth = await checkAuth()
  if (unauth) return unauth

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await db.product.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
