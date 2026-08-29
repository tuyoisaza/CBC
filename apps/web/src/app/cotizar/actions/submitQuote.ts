'use server'

import { db } from '@/lib/db'
import { z } from 'zod'

const itemSchema = z.object({
  methodId: z.string().min(1),
  methodName: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
})

const extraItemSchema = z.object({
  extraId: z.string().min(1),
  name: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
})

// Loose international phone check: strip everything but digits, require 10–15.
const whatsappSchema = z.string().transform((v) => v.replace(/[^\d]/g, '')).pipe(
  z.string().min(10, 'Número de WhatsApp inválido').max(15, 'Número de WhatsApp inválido'),
)

const submitQuoteSchema = z.object({
  companyName: z.string().trim().min(1, 'La empresa es requerida'),
  contactName: z.string().trim().min(1, 'El nombre es requerido'),
  email: z.string().trim().email('Correo electrónico inválido'),
  whatsapp: whatsappSchema,
  items: z.array(itemSchema).min(1, 'Agrega al menos un producto'),
  extras: z.array(extraItemSchema),
  shippingZoneId: z.string().min(1),
  deliveryDate: z.string().optional(),
  rush: z.boolean(),
  subtotal: z.number(),
  discount: z.number(),
  discountPct: z.number(),
  extrasTotal: z.number(),
  shippingFee: z.number(),
  rushFee: z.number(),
  iva: z.number(),
  total: z.number(),
  advancePct: z.number(),
  advanceAmount: z.number(),
})

export async function submitQuote(input: z.infer<typeof submitQuoteSchema>) {
  const parsed = submitQuoteSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Datos de cotización inválidos')
  }
  const data = parsed.data

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
      items: data.items as any,
      extraItems: data.extras as any,
      shippingZoneId: data.shippingZoneId,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      rush: data.rush,
      subtotal: data.subtotal,
      discount: data.discount,
      discountPct: data.discountPct,
      shippingFee: data.shippingFee,
      rushFee: data.rushFee,
      iva: data.iva,
      total: data.total,
      advancePct: data.advancePct,
      advanceAmount: data.advanceAmount,
      status: 'Cotización creada',
    },
  })

  return { success: true, quoteId: quote.id, quoteCode }
}
