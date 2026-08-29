import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { Preference } from 'mercadopago'
import { mercadopagoClient } from '@/lib/mercadopago'
import { getSingleMarkupPct, priceWithTax, priceBeforeTax, taxAmount } from '@/lib/pricing'

// Loose international phone check: strip everything but digits, require 10–15.
const whatsappSchema = z.string().transform((v) => v.replace(/[^\d]/g, '')).pipe(
  z.string().min(10, 'Número de WhatsApp inválido').max(15, 'Número de WhatsApp inválido'),
)

const bodySchema = z.object({
  slug: z.string(),
  name: z.string().trim().min(1, 'El nombre es requerido'),
  email: z.string().trim().email('Correo electrónico inválido').optional().or(z.literal('')),
  whatsapp: whatsappSchema,
})

// Mercado Pago's SDK doesn't always throw plain Error instances — extract a
// readable message from whatever shape shows up (Error, {message}, {cause}, etc.)
// so the UI never has to fall back to a generic "Error desconocido".
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const anyErr = err as Record<string, unknown>
    if (typeof anyErr.message === 'string') return anyErr.message
    if (anyErr.cause) return errorMessage(anyErr.cause)
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }
  return String(err)
}

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json())

    const product = await db.product.findUnique({ where: { slug: body.slug } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const markupPct = await getSingleMarkupPct()
    const finalPrice = priceWithTax(product.price, markupPct)

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

    const subtotal = priceBeforeTax(finalPrice)
    const iva = taxAmount(finalPrice)
    const quote = await db.quote.create({
      data: {
        leadId: lead.id,
        customerId: customer.id,
        items: [{ type: product.slug, qty: 1, unitPrice: finalPrice, subtotal }],
        subtotal,
        iva,
        total: finalPrice,
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
    // Log the raw, unprocessed error so Railway logs show whatever shape it
    // actually came in (Mercado Pago's SDK doesn't always throw plain Errors).
    console.error('[single-checkout] error', JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Object ? err : {})), err)

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || 'Datos de compra inválidos. Revisa el formulario.', code: 'VALIDATION_ERROR', details: err.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const message = errorMessage(err)
    return NextResponse.json(
      { error: `No se pudo iniciar el pago: ${message}`, code: 'CHECKOUT_ERROR' },
      { status: 500 },
    )
  }
}
