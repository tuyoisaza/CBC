import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { notifyNewQuote, sendLeadAutoAck } from '@/lib/notifications'

const log = createLogger('api/quote/submit')

export const dynamic = 'force-dynamic'

const submitSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(8),
  items: z.array(z.object({ methodId: z.string(), methodName: z.string(), qty: z.number().int().positive(), unitPrice: z.number(), lineTotal: z.number() })),
  extras: z.array(z.object({ extraId: z.string(), name: z.string(), qty: z.number().int().positive(), unitPrice: z.number(), lineTotal: z.number() })).optional().default([]),
  shippingZoneId: z.string(),
  deliveryDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), { message: 'Invalid delivery date' }),
  rush: z.boolean().default(false),
  subtotal: z.number(),
  discount: z.number(),
  discountPct: z.number(),
  extrasTotal: z.number().optional().default(0),
  shippingFee: z.number(),
  rushFee: z.number(),
  iva: z.number(),
  total: z.number(),
  advancePct: z.number(),
  advanceAmount: z.number(),
})

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
    }

    const body = await req.json()
    const parsed = submitSchema.parse(body)

    const result = await db.$transaction(async (tx) => {
      const methodIds = parsed.items.map(i => i.methodId)
      const extraIds = parsed.extras.map(e => e.extraId)

      const [foundMethods, foundExtras, zone] = await Promise.all([
        tx.method.findMany({ where: { id: { in: methodIds } } }),
        tx.extra.findMany({ where: { id: { in: extraIds } } }),
        tx.shippingZone.findUnique({ where: { id: parsed.shippingZoneId } }),
      ])

      const foundMethodIds = new Set(foundMethods.map(m => m.id))
      const missingMethods = parsed.items.filter(i => !foundMethodIds.has(i.methodId))
      if (missingMethods.length > 0) {
        throw new Error(`Invalid methods: ${missingMethods.map(i => i.methodId).join(', ')}`)
      }

      const foundExtraIds = new Set(foundExtras.map(e => e.id))
      const missingExtras = parsed.extras.filter(e => !foundExtraIds.has(e.extraId))
      if (missingExtras.length > 0) {
        throw new Error(`Invalid extras: ${missingExtras.map(e => e.extraId).join(', ')}`)
      }

      if (!zone) throw new Error('Invalid shipping zone')

      const customer = await tx.customer.upsert({
        where: { whatsapp: parsed.whatsapp },
        update: { companyName: parsed.companyName, contactName: parsed.contactName, email: parsed.email },
        create: { companyName: parsed.companyName, contactName: parsed.contactName, email: parsed.email, whatsapp: parsed.whatsapp },
      })

      const lead = await tx.lead.create({
        data: {
          customerId: customer.id,
          source: 'cotizador',
          status: 'new',
        },
      })

      const count = await tx.quote.count()
      const quoteCode = `CBC-Q-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

      const quote = await tx.quote.create({
        data: {
          quoteCode,
          leadId: lead.id,
          customerId: customer.id,
          items: parsed.items,
          extraItems: parsed.extras,
          shippingZoneId: parsed.shippingZoneId,
          deliveryDate: parsed.deliveryDate ? new Date(parsed.deliveryDate) : null,
          rush: parsed.rush,
          subtotal: parsed.subtotal,
          discount: parsed.discount,
          discountPct: parsed.discountPct,
          shippingFee: parsed.shippingFee,
          rushFee: parsed.rushFee,
          iva: parsed.iva,
          total: parsed.total,
          advancePct: parsed.advancePct,
          advanceAmount: parsed.advanceAmount,
          status: 'Cotización creada',
        },
      })

      return { quoteId: quote.id, leadId: lead.id, quoteCode, companyName: parsed.companyName, contactName: parsed.contactName, email: parsed.email, whatsapp: parsed.whatsapp, total: parsed.total, items: parsed.items }
    })

    notifyNewQuote({
      companyName: result.companyName,
      contactName: result.contactName,
      email: result.email,
      whatsapp: result.whatsapp,
      total: result.total,
      quoteCode: result.quoteCode,
      items: result.items.map((i: any) => `${i.qty}× ${i.methodName}`).join(', '),
    }).catch(() => {})

    // Speed-to-lead: instant acknowledgment in Lorena's voice (never prices).
    // Recorded as an outbound Message so first-response time is measurable.
    sendLeadAutoAck({
      whatsapp: result.whatsapp,
      contactName: result.contactName,
      companyName: result.companyName,
    })
      .then((body) =>
        body
          ? db.message.create({
              data: {
                from: 'cbc-auto',
                to: result.whatsapp,
                body,
                direction: 'outbound',
                platform: 'whatsapp',
                status: 'read',
                leadId: result.leadId,
                sentAt: new Date(),
              },
            })
          : null
      )
      .catch(() => {})

    return NextResponse.json({ success: true, quoteId: result.quoteId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    if (error instanceof Error && (error.message.startsWith('Invalid methods') || error.message.startsWith('Invalid extras') || error.message === 'Invalid shipping zone')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    log.error({ path: '/api/quote/submit', method: 'POST', error }, 'Failed to submit quote')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
