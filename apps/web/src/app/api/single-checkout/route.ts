import { NextRequest, NextResponse } from 'next/server'
import { db, withDbRetry } from '@/lib/db'
import { getOrCreateCustomer } from '@/lib/db-helpers'
import { z } from 'zod'
import { Prisma } from '@cbc/db'
import { Preference } from 'mercadopago'
import { mercadopagoClient } from '@/lib/mercadopago'
import { createSingleCheckoutSession, isStripeConfigured } from '@/lib/stripe'
import { getPaymentConfig, type PaymentProvider } from '@/lib/payment-config'
import { getRetailShippingQuote } from '@/lib/shipping'
import { getSingleMarkupPct, priceWithTax, priceBeforeTax, taxAmount } from '@/lib/pricing'

// Loose international phone check: strip everything but digits, require 10–15.
const whatsappSchema = z.string().transform((v) => v.replace(/[^\d]/g, '')).pipe(
  z.string().min(10, 'Número de WhatsApp inválido').max(15, 'Número de WhatsApp inválido'),
)

const cp = z.string().trim().regex(/^\d{5}$/, 'Código postal inválido (5 dígitos)')

const addressSchema = z.object({
  street: z.string().trim().min(1, 'La calle es requerida'),
  extNo: z.string().trim().min(1, 'El número exterior es requerido'),
  intNo: z.string().trim().optional().or(z.literal('')),
  colonia: z.string().trim().min(1, 'La colonia es requerida'),
  cp,
  city: z.string().trim().min(1, 'La ciudad es requerida'),
  state: z.string().trim().min(1, 'El estado es requerido'),
  references: z.string().trim().max(300).optional().or(z.literal('')),
})

const cfdiSchema = z.object({
  rfc: z.string().trim().min(12, 'RFC inválido').max(13, 'RFC inválido'),
  razonSocial: z.string().trim().min(1, 'La razón social es requerida'),
  regimenFiscal: z.string().trim().min(3, 'Selecciona un régimen fiscal'),
  usoCfdi: z.string().trim().min(3, 'Selecciona un uso de CFDI'),
  cpFiscal: cp,
})

const bodySchema = z
  .object({
    slug: z.string(),
    name: z.string().trim().min(1, 'El nombre es requerido'),
    email: z.string().trim().email('Correo electrónico inválido').optional().or(z.literal('')),
    whatsapp: whatsappSchema,
    provider: z.enum(['stripe', 'mercadopago']).optional(),
    address: addressSchema,
    isGift: z.boolean().default(false),
    giftMessage: z.string().trim().max(500).optional().or(z.literal('')),
    recipientName: z.string().trim().max(120).optional().or(z.literal('')),
    needsCfdi: z.boolean().default(false),
    cfdi: cfdiSchema.optional(),
  })
  .refine((d) => !d.needsCfdi || !!d.cfdi, {
    message: 'Faltan los datos de facturación',
    path: ['cfdi'],
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
    // Early reads use withDbRetry: on a cold container / Postgres restart the
    // first query can race the connection ("database system is starting up").
    const config = await withDbRetry(() => getPaymentConfig())
    const enabled = config.singleProviders
    provider = body.provider ?? enabled[0] ?? 'mercadopago'
    if (!enabled.includes(provider)) {
      return NextResponse.json(
        { error: `El método de pago "${provider}" no está habilitado.`, code: 'PROVIDER_DISABLED', step, provider },
        { status: 400 },
      )
    }
    if (provider === 'stripe' && !isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe no está configurado en el servidor.', code: 'PROVIDER_NOT_CONFIGURED', step, provider },
        { status: 503 },
      )
    }

    step = 'load-product'
    const product = await withDbRetry(() => db.product.findUnique({ where: { slug: body.slug } }))
    if (!product) {
      console.warn('[single-checkout] product not found', JSON.stringify({ slug: body.slug, referer }))
      return NextResponse.json(
        { error: 'Producto no encontrado.', code: 'PRODUCT_NOT_FOUND', step, slug: body.slug },
        { status: 404 },
      )
    }

    step = 'price'
    const markupPct = await withDbRetry(() => getSingleMarkupPct())
    const goodsTotal = priceWithTax(product.price, markupPct)
    const ship = await withDbRetry(() => getRetailShippingQuote(goodsTotal))
    const orderTotal = Math.round((goodsTotal + ship.cost) * 100) / 100

    const count = await withDbRetry(() => db.order.count())
    const orderCode = `CBC-${new Date().getFullYear()}-S-${String(count + 1).padStart(3, '0')}`

    step = 'create-customer'
    const customer = await getOrCreateCustomer({
      companyName: body.name,
      contactName: body.name,
      email: body.email || null,
      whatsapp: body.whatsapp,
    })

    if (body.needsCfdi && body.cfdi) {
      await db.customer.update({
        where: { id: customer.id },
        data: {
          rfc: body.cfdi.rfc,
          razonSocial: body.cfdi.razonSocial,
          regimenFiscal: body.cfdi.regimenFiscal,
          usoCfdi: body.cfdi.usoCfdi,
          codigoPostalFiscal: body.cfdi.cpFiscal,
          emailFacturacion: body.email || null,
        },
      })
    }

    step = 'create-lead'
    const lead = await db.lead.create({
      data: { customerId: customer.id, source: 'single-purchase', boxType: 'single', quantity: 1 },
    })

    const items: Prisma.InputJsonValue[] = [
      { type: product.slug, qty: 1, unitPrice: goodsTotal, subtotal: goodsTotal },
    ]
    if (ship.cost > 0) items.push({ type: 'shipping', qty: 1, unitPrice: ship.cost, subtotal: ship.cost })

    step = 'create-quote'
    const quote = await db.quote.create({
      data: {
        leadId: lead.id,
        customerId: customer.id,
        items,
        subtotal: priceBeforeTax(orderTotal),
        iva: taxAmount(orderTotal),
        total: orderTotal,
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
        channel: 'retail',
        shipping: {
          name: body.recipientName || body.name,
          phone: body.whatsapp,
          street: body.address.street,
          extNo: body.address.extNo,
          intNo: body.address.intNo || null,
          colonia: body.address.colonia,
          cp: body.address.cp,
          city: body.address.city,
          state: body.address.state,
          country: 'MX',
          references: body.address.references || null,
        },
        shippingCP: body.address.cp,
        shippingCity: body.address.city,
        shippingCost: ship.cost,
        shippingMethod: ship.method,
        isGift: body.isGift,
        giftMessage: body.giftMessage || null,
        recipientName: body.recipientName || null,
        needsCfdi: body.needsCfdi,
      },
    })

    // ── Provider branch ────────────────────────────────────────────────────
    const sharedMeta = {
      orderId: order.id,
      orderCode,
      type: 'full',
      customerId: customer.id,
      channel: 'retail',
      shippingCost: String(ship.cost),
    }

    let checkoutUrl: string
    let externalId: string

    if (provider === 'stripe') {
      step = 'stripe-create-session'
      const lineItems = [
        {
          price_data: {
            currency: 'mxn' as const,
            unit_amount: Math.round(goodsTotal * 100),
            product_data: { name: `1 × ${product.name}` },
          },
          quantity: 1,
        },
      ]
      if (ship.cost > 0) {
        lineItems.push({
          price_data: {
            currency: 'mxn' as const,
            unit_amount: Math.round(ship.cost * 100),
            product_data: { name: 'Envío' },
          },
          quantity: 1,
        })
      }
      const stripeSession = await createSingleCheckoutSession({
        slug: body.slug,
        customerEmail: body.email || null,
        lineItems,
        metadata: sharedMeta,
      })
      if (!stripeSession.url) throw new Error('Stripe no devolvió una URL de checkout')
      checkoutUrl = stripeSession.url
      externalId = stripeSession.id
    } else {
      step = 'mp-create-preference'
      const mpItems = [
        { id: product.slug, title: `1 × ${product.name}`, quantity: 1, unit_price: goodsTotal },
      ]
      if (ship.cost > 0) mpItems.push({ id: 'shipping', title: 'Envío', quantity: 1, unit_price: ship.cost })

      const preference = await new Preference(mercadopagoClient).create({
        body: {
          items: mpItems,
          payer: {
            name: body.name,
            email: body.email || undefined,
          },
          back_urls: {
            success: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${body.slug}?compra=exito&order=${order.orderCode}`,
            failure: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${body.slug}?compra=fallo`,
            pending: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${body.slug}?compra=pendiente&order=${order.orderCode}`,
          },
          auto_return: 'approved',
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
          external_reference: order.id,
          metadata: sharedMeta,
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
        amount: orderTotal,
        currency: 'MXN',
        type: 'full',
        status: 'pending',
        stripePaymentId: externalId,
      },
    })

    return NextResponse.json({ url: checkoutUrl, provider, orderCode })
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

    let hint = ''
    if (/database system is starting up|PrismaClientInitializationError|Can't reach database server/i.test(message)) {
      hint = ' (la base de datos estaba reiniciando — reintenta en unos segundos)'
    } else if (step === 'create-customer' && /Unique constraint/i.test(message)) {
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
      { error: `No se pudo iniciar el pago [${step}]: ${message}${hint}`, code: 'CHECKOUT_ERROR', step, slug, provider },
      { status: 502 },
    )
  }
}
