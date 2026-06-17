import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/quote/calculate')

export const dynamic = 'force-dynamic'

const calcSchema = z.object({
  items: z.array(z.object({
    methodId: z.string(),
    qty: z.number().int().positive(),
  })).min(1, 'At least one item is required'),
  extras: z.array(z.object({
    extraId: z.string(),
    qty: z.number().int().positive().default(1),
  })).optional().default([]),
  shippingZoneId: z.string(),
  rush: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = calcSchema.parse(body)

    const [methods, extras, zone, discounts, settings] = await Promise.all([
      db.method.findMany({ where: { id: { in: parsed.items.map(i => i.methodId) } } }),
      db.extra.findMany({ where: { id: { in: parsed.extras.map(e => e.extraId) } } }),
      db.shippingZone.findUnique({ where: { id: parsed.shippingZoneId } }),
      db.volumeDiscount.findMany({ orderBy: { minQty: 'asc' } }),
      db.setting.findMany({ where: { key: { in: ['RUSH_FEE_PCT', 'ADVANCE_PCT', 'IVA_PCT'] } } }),
    ])

    if (!zone) return NextResponse.json({ error: 'Invalid zone' }, { status: 400 })

    const foundMethodIds = new Set(methods.map(m => m.id))
    const missingMethods = parsed.items.filter(i => !foundMethodIds.has(i.methodId))
    if (missingMethods.length > 0) {
      return NextResponse.json({ error: 'Invalid methods', details: missingMethods.map(i => i.methodId) }, { status: 400 })
    }

    const foundExtraIds = new Set(extras.map(e => e.id))
    const missingExtras = parsed.extras.filter(e => !foundExtraIds.has(e.extraId))
    if (missingExtras.length > 0) {
      return NextResponse.json({ error: 'Invalid extras', details: missingExtras.map(e => e.extraId) }, { status: 400 })
    }

    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]))

    const methodMap = new Map(methods.map(m => [m.id, m]))
    const subtotal = parsed.items.reduce((sum, item) => {
      return sum + methodMap.get(item.methodId)!.unitPrice * item.qty
    }, 0)

    const totalUnits = parsed.items.reduce((sum, i) => sum + i.qty, 0)
    const discountTier = discounts.filter(d => d.minQty <= totalUnits && (d.maxQty === null || d.maxQty >= totalUnits)).at(-1)
    const discountPct = discountTier?.discountPct ?? 0
    const discount = subtotal * (discountPct / 100)

    const extraMap = new Map(extras.map(e => [e.id, e]))
    const extrasTotal = parsed.extras.reduce((sum, item) => {
      return sum + extraMap.get(item.extraId)!.unitPrice * item.qty
    }, 0)

    const shippingFee = zone.baseFee + zone.feePerUnit * totalUnits

    const rushFeePct = Number(settingsMap['RUSH_FEE_PCT'] ?? 40)
    const rushFee = parsed.rush ? (subtotal - discount) * (rushFeePct / 100) : 0

    const ivaPct = Number(settingsMap['IVA_PCT'] ?? 16)
    const afterDiscount = subtotal - discount + extrasTotal + shippingFee + rushFee
    const iva = afterDiscount * (ivaPct / 100)
    const total = afterDiscount + iva

    const advancePct = Number(settingsMap['ADVANCE_PCT'] ?? 50)
    const advanceAmount = total * (advancePct / 100)

    return NextResponse.json({
      subtotal,
      discount,
      discountPct,
      extrasTotal,
      shippingFee,
      rushFee,
      iva,
      total,
      advancePct,
      advanceAmount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    log.error({ path: '/api/quote/calculate', method: 'POST', error }, 'Failed to calculate quote')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
