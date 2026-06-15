import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

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
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const products = await db.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
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
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await req.json()
  const data = productSchema.partial().parse(body)
  const product = await db.product.update({ where: { id }, data })
  return NextResponse.json(product)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await db.product.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
