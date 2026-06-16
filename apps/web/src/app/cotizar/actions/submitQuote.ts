'use server'

import { db } from '@/lib/db'

interface Item {
  methodId: string
  methodName: string
  qty: number
  unitPrice: number
  lineTotal: number
}

interface ExtraItem {
  extraId: string
  name: string
  qty: number
  unitPrice: number
  lineTotal: number
}

export async function submitQuote(data: {
  companyName: string
  contactName: string
  email: string
  whatsapp: string
  items: Item[]
  extras: ExtraItem[]
  shippingZoneId: string
  deliveryDate?: string
  rush: boolean
  subtotal: number
  discount: number
  discountPct: number
  extrasTotal: number
  shippingFee: number
  rushFee: number
  iva: number
  total: number
  advancePct: number
  advanceAmount: number
}) {
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
