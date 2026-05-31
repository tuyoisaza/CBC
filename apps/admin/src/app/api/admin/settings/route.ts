import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  key:   z.string().min(1),
  value: z.string(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key, value } = schema.parse(await req.json())

  await db.setting.upsert({
    where:  { key },
    update: { value },
    create: { key, value },
  })

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const key = url.searchParams.get('key')

  if (key) {
    const setting = await db.setting.findUnique({ where: { key } })
    return NextResponse.json(setting)
  }

  const settings = await db.setting.findMany()
  return NextResponse.json(settings)
}
