'use server'

import { db } from '@/lib/db'
import { z } from 'zod'
import { sendQuoteToCustomer } from '@/lib/notifications'
import { calculateQuoteForSave, quoteSelectionSchema } from '@/lib/quote-server-calculation'

// Loose international phone check: strip everything but digits, require 10–15.
const whatsappSchema = z.string().transform((v) => v.replace(/[^\d]/g, '')).pipe(
  z.string().min(10, 'Número de WhatsApp inválido').max(15, 'Número de WhatsApp inválido'),
)

const submitQuoteSchema = z.object({
  companyName: z.string().trim().min(1, 'La empresa es requerida'),
  contactName: z.string().trim().min(1, 'El nombre es requerido'),
  email: z.string().trim().email('Correo electrónico inválido'),
  whatsapp: whatsappSchema,
  ...quoteSelectionSchema.shape,
})

export async function submitQuote(input: z.infer<typeof submitQuoteSchema>) {
  const parsed = submitQuoteSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Datos de cotización inválidos')
  }
  const data = parsed.data

  let quoteCalc
  try {
    quoteCalc = await calculateQuoteForSave(db, data)
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Datos de cotización inválidos')
  }

  const customer = await db.customer.upsert({
    where: { whatsapp: data.whatsapp },
    update: { companyName: data.companyName, contactName: data.contactName, email: data.email },
    create: { companyName: data.companyName, contactName: data.contactName, email: data.email, whatsapp: data.whatsapp },
  })

  const lead = await db.lead.create({
    data: { customerId: customer.id, source: 'cotizador', status: 'new' },
  })

  const count = await db.quote.count()
  const quoteCode = `CBC-Q-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

  const quote = await db.quote.create({
    data: {
      quoteCode,
      leadId: lead.id,
      customerId: customer.id,
      items: quoteCalc.items as any,
      extraItems: quoteCalc.extras as any,
      shippingZoneId: quoteCalc.shippingZoneId,
      deliveryDate: quoteCalc.deliveryDate,
      rush: quoteCalc.rush,
      subtotal: quoteCalc.subtotal,
      discount: quoteCalc.discount,
      discountPct: quoteCalc.discountPct,
      shippingFee: quoteCalc.shippingFee,
      rushFee: quoteCalc.rushFee,
      iva: quoteCalc.iva,
      total: quoteCalc.total,
      advancePct: quoteCalc.advancePct,
      advanceAmount: quoteCalc.advanceAmount,
      status: 'Cotización creada',
    },
  })

  // Customer quote email with method/extra images — non-blocking, never fails the quote.
  try {
    const [methodRows, extraRows] = await Promise.all([
      db.method.findMany({ where: { id: { in: data.items.map((i) => i.methodId) } } }),
      data.extras.length
        ? db.extra.findMany({ where: { id: { in: data.extras.map((e) => e.extraId) } } })
        : Promise.resolve([]),
    ])
    const mById = new Map(methodRows.map((m) => [m.id, m]))
    const eById = new Map(extraRows.map((e) => [e.id, e]))
    const lines = [
      ...quoteCalc.items.map((i) => {
        const m = mById.get(i.methodId)
        return { name: m?.name ?? i.methodName, description: m?.description ?? null, imageUrl: m?.imageUrl ?? null, qty: i.qty }
      }),
      ...quoteCalc.extras.map((e) => {
        const x = eById.get(e.extraId)
        return { name: e.description, description: x?.description ?? null, imageUrl: x?.images?.[0] ?? x?.imageUrl ?? null, qty: e.qty }
      }),
    ]
    await sendQuoteToCustomer({
      email: data.email,
      contactName: data.contactName,
      companyName: data.companyName,
      quoteCode,
      lines,
      subtotal: quoteCalc.subtotal,
      discount: quoteCalc.discount,
      discountPct: quoteCalc.discountPct,
      extrasTotal: quoteCalc.extrasTotal,
      shippingFee: quoteCalc.shippingFee,
      rushFee: quoteCalc.rushFee,
      iva: quoteCalc.iva,
      total: quoteCalc.total,
      advancePct: quoteCalc.advancePct,
      advanceAmount: quoteCalc.advanceAmount,
      deliveryDate: data.deliveryDate ?? null,
    })
  } catch (err) {
    console.error('[submitQuote] quote email failed', err)
  }

  return { success: true, quoteId: quote.id, quoteCode }
}
