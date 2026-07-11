import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { updateEngineCoffee } from '@/lib/engine'
import { isEngineRequest } from '@/lib/engine-auth'

const coffeeSchema = z.object({
  name:          z.string().min(2),
  originCountry: z.string().default('México'),
  originRegion:  z.string().min(1),
  originFarm:    z.string().optional(),
  variety:       z.string().optional(),
  process:       z.string().optional(),
  roast:         z.string().optional(),
  tastingNotes:  z.array(z.string()).min(1),
  story:         z.string().optional(),
  brewGuide:     z.object({
    prensa: z.string().optional(),
    moka:   z.string().optional(),
  }).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const coffees = await db.coffee.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(coffees)
}

export async function POST(req: NextRequest) {
  // Session (admin UI) or engine token (WhatsApp coffee updates via the engine)
  const session = await getServerSession(authOptions)
  if (!session && !isEngineRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const data = coffeeSchema.parse(body)

  // Deactivate all current coffees
  await db.coffee.updateMany({ data: { active: false } })

  // Create new active coffee
  const coffee = await db.coffee.create({
    data: { ...data, active: true },
  })

  // Sync to engine (non-fatal if engine is offline)
  await updateEngineCoffee(coffee as any)

  return NextResponse.json(coffee, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const id  = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await req.json()

  // If activating this coffee, deactivate others
  if (body.active === true) {
    await db.coffee.updateMany({ data: { active: false } })
  }

  const coffee = await db.coffee.update({ where: { id }, data: body })

  if (coffee.active) {
    await updateEngineCoffee(coffee as any)
  }

  return NextResponse.json(coffee)
}
