import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { Preference } from 'mercadopago'
import { mercadopagoClient } from '@/lib/mercadopago'
import { getSingleMarkupPct, markedUpPrice } from '@/lib/pricing'

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

    const markupPct = await getSingleMarkupPct()
    const finalPrice = markedUpPrice(product.price, markupPct)

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
        items: [{ type: product.slug, qty: 1, unitPrice: finalPrice, subtotal: finalPrice }],
        subtotal: finalPrice,
        iva: Math.round(finalPrice * 0.16 * 100) / 100,
        total: Math.round(finalPrice * 1.16 * 100) / 100,
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

    const preference = await new Preference(mercadopagoClient).create({
      body: {
        items: [{
          id: product.slug,
          title: `1 × ${product.name}`,
          quantity: 1,
          unit_price: finalPrice,
        }],
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${body.slug}?compra=exito`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${body.slug}?compra=fallo`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${body.slug}?compra=pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        external_reference: order.id,
      },
    })

    await db.payment.create({
      data: {
        orderId: order.id,
        amount: finalPrice,
        currency: 'MXN',
        type: 'full',
        status: 'pending',
        stripePaymentId: preference.id,
      },
    })

    return NextResponse.json({ url: preference.init_point })
  } catch (err) {
    console.error('[single-checkout] error', err)

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos de compra inválidos. Revisa el formulario.', code: 'VALIDATION_ERROR', details: err.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const message = err instanceof Error ? err.message : 'Error desconocido al procesar el pago'
    return NextResponse.json(
      { error: `No se pudo iniciar el pago: ${message}`, code: 'CHECKOUT_ERROR' },
      { status: 500 },
    )
  }
}
