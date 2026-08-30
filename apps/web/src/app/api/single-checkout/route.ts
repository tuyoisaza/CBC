import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrCreateCustomer } from '@/lib/db-helpers'
import { z } from 'zod'
import { Preference } from 'mercadopago'
import { mercadopagoClient } from '@/lib/mercadopago'
import { createSingleCheckoutSession, isStripeConfigured } from '@/lib/stripe'
import { getPaymentConfig, type PaymentProvider } from '@/lib/payment-config'
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
  provider: z.enum(['stripe', 'mercadopago']).optional(),
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

// Steps the request moves through, so a failure log/response says exactly where
// it broke instead of just "checkout error".
type Step =
  | 'parse-body'
  | 'resolve-provider'
  | 'load-product'
  | 'price'
  | 'create-customer'
  | 'create-lead'
  | 'create-quote'
  | 'create-order'
  | 'mp-create-preference'
  | 'stripe-create-session'
  | 'record-payment'

export async function POST(req: NextRequest) {
  let step: Step = 'parse-body'
  let slug: string | null = null
  let provider: PaymentProvider = 'mercadopago'
  const referer = req.headers.get('referer') || null

  try {
    const body = bodySchema.parse(await req.json())
    slug = body.slug

    step = 'resolve-provider'
    const config = await getPaymentConfig()
    const enabled = config.singleProviders
    provider = body.provider ?? enabled[0] ?? 'mercadopago'
    if (!enabled.includes(provider)) {
      return NextResponse.json(
        {
          error: `El método de pago "${provider}" no está habilitado.`,
          code: 'PROVIDER_DISABLED',
          step,
          provider,
        },
        { status: 400 },
      )
    }
    if (provider === 'stripe' && !isStripeConfigured()) {
      return NextResponse.json(
        {
          error: 'Stripe no está configurado en el servidor.',
          code: 'PROVIDER_NOT_CONFIGURED',
          step,
          provider,
        },
        { status: 503 },
      )
    }

    step = 'load-product'
    const product = await db.product.findUnique({ where: { slug: body.slug } })
    if (!product) {
      console.warn('[single-checkout] product not found', JSON.stringify({ slug: body.slug, referer }))
      return NextResponse.json(
        { error: 'Producto no encontrado.', code: 'PRODUCT_NOT_FOUND', step, slug: body.slug },
        { status: 404 },
      )
    }

    step = 'price'
    const markupPct = await getSingleMarkupPct()
    const finalPrice = priceWithTax(product.price, markupPct)

    const count = await db.order.count()
    const orderCode = `CBC-${new Date().getFullYear()}-S-${String(count + 1).padStart(3, '0')}`

    step = 'create-customer'
    const customer = await getOrCreateCustomer({
      companyName: body.name,
      contactName: body.name,
      email: body.email || null,
      whatsapp: body.whatsapp,
    })

    step = 'create-lead'
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

    step = 'create-quote'
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

    step = 'create-order'
    const order = await db.order.create({
      data: {
        orderCode,
        quoteId: quote.id,
        customerId: customer.id,
        status: 'confirmed',
      },
    })

    // ── Provider branch ────────────────────────────────────────────────────
    let checkoutUrl: string
    let externalId: string

    if (provider === 'stripe') {
      step = 'stripe-create-session'
      const stripeSession = await createSingleCheckoutSession({
        amount: finalPrice,
        productName: `1 × ${product.name}`,
        slug: body.slug,
        customerEmail: body.email || null,
        metadata: {
          orderId: order.id,
          orderCode,
          type: 'full',
          customerId: customer.id,
        },
      })
      if (!stripeSession.url) throw new Error('Stripe no devolvió una URL de checkout')
      checkoutUrl = stripeSession.url
      externalId = stripeSession.id
    } else {
      step = 'mp-create-preference'
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
      if (!preference.init_point) throw new Error('Mercado Pago no devolvió un enlace de pago')
      checkoutUrl = preference.init_point
      externalId = preference.id!
    }

    step = 'record-payment'
    await db.payment.create({
      data: {
        orderId: order.id,
        provider,
        amount: finalPrice,
        currency: 'MXN',
        type: 'full',
        status: 'pending',
        stripePaymentId: externalId,
      },
    })

    return NextResponse.json({ url: checkoutUrl, provider })
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn('[single-checkout] validation failed', JSON.stringify({ step, slug, referer, issues: err.flatten().fieldErrors }))
      return NextResponse.json(
        {
          error: err.issues[0]?.message || 'Datos de compra inválidos. Revisa el formulario.',
          code: 'VALIDATION_ERROR',
          step,
          details: err.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const message = errorMessage(err)

    // Structured, greppable failure context: which route, which product page,
    // which provider, and exactly which step blew up.
    const context = {
      route: 'POST /api/single-checkout',
      url: req.url,
      referer,
      slug,
      provider,
      step,
      message,
    }
    console.error(
      '[single-checkout] FAILED',
      JSON.stringify(context),
      '\nraw error:',
      JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Object ? err : {})),
      err,
    )

    // Map the common infra failures to a message an operator can act on.
    let hint = ''
    if (step === 'create-customer' && /Unique constraint/i.test(message)) {
      hint = ' (cliente duplicado — revisar getOrCreateCustomer)'
    } else if (step === 'mp-create-preference') {
      hint = /403|UNAUTHORIZED|policy/i.test(message)
        ? ' (Mercado Pago rechazó las credenciales — revisar MERCADOPAGO_ACCESS_TOKEN)'
        : ' (Mercado Pago no respondió — revisar estado del servicio)'
    } else if (step === 'stripe-create-session') {
      hint = /API key|401|authentication/i.test(message)
        ? ' (Stripe rechazó la API key — revisar STRIPE_SECRET_KEY)'
        : ' (Stripe no respondió — revisar estado del servicio)'
    }

    return NextResponse.json(
      {
        error: `No se pudo iniciar el pago [${step}]: ${message}${hint}`,
        code: 'CHECKOUT_ERROR',
        step,
        slug,
        provider,
      },
      { status: 502 },
    )
  }
}
