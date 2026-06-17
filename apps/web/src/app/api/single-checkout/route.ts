import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

const bodySchema = z.object({
  slug: z.string(),
  name: z.string().min(1),
  email: z.string().optional(),
  whatsapp: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json())

    const product = await db.product.findUnique({ where: { slug: body.slug } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const markupSetting = await db.setting.findUnique({ where: { key: 'single_purchase_markup' } })
    const markupPct = parseFloat(markupSetting?.value || '20')
    const markedUpPrice = Math.round(product.price * (1 + markupPct / 100) * 100) / 100

    const count = await db.order.count()
    const orderCode = `CBC-${new Date().getFullYear()}-S-${String(count + 1).padStart(3, '0')}`

    const customer = await db.customer.create({
      data: {
        companyName: body.name,
        contactName: body.name,
        email: body.email || null,
        whatsapp: body.whatsapp,
      },
    })

    const lead = await db.lead.create({
      data: {
        customerId: customer.id,
        source: 'single-purchase',
        boxType: 'single',
        quantity: 1,
      },
    })

    const quote = await db.quote.create({
      data: {
        leadId: lead.id,
        customerId: customer.id,
        items: [{ type: product.slug, qty: 1, unitPrice: markedUpPrice, subtotal: markedUpPrice }],
        subtotal: markedUpPrice,
        iva: Math.round(markedUpPrice * 0.16 * 100) / 100,
        total: Math.round(markedUpPrice * 1.16 * 100) / 100,
        status: 'Pagado',
      },
    })

    const order = await db.order.create({
      data: {
        orderCode,
        quoteId: quote.id,
        customerId: customer.id,
        status: 'confirmed',
      },
    })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: { name: `1 × ${product.name}` },
          unit_amount: Math.round(markedUpPrice * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${body.slug}?compra=exito`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${body.slug}`,
      customer_email: body.email || undefined,
      phone_number_collection: { enabled: true },
      metadata: {
        type: 'full',
        orderId: order.id,
        orderCode,
        customerId: customer.id,
      },
    })

    await db.payment.create({
      data: {
        orderId: order.id,
        amount: markedUpPrice,
        currency: 'MXN',
        type: 'full',
        status: 'pending',
        stripePaymentId: session.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Single checkout error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
