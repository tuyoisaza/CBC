import { NextRequest, NextResponse } from 'next/server'
import { db, withDbRetry, ensureDbAwake } from '@/lib/db'
import { getOrCreateCustomer } from '@/lib/db-helpers'
import { z } from 'zod'
import { Prisma } from '@cbc/db'
import { createHash, randomUUID } from 'node:crypto'
import { assertMercadoPagoConfigured, createMercadoPagoPreference } from '@/lib/mercadopago'
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
    idempotencyKey: z.string().uuid(),
    slug: z.string().trim().min(1),
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

type Step =
  | 'parse-body'
  | 'wake-db'
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

// Always answer 200 with an `ok` flag. A non-2xx from here gets swallowed by
// Cloudflare (it replaces origin 5xx bodies with its own HTML page), so the
// browser would never see this JSON and the UI would show a generic error.
function checkoutError(
  error: string,
  code: string,
  step: Step,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({ ok: false, error, code, step, ...extra }, { status: 200 })
}

export async function POST(req: NextRequest) {
  let step: Step = 'parse-body'
  let slug: string | null = null
  let provider: PaymentProvider = 'mercadopago'
  const referer = req.headers.get('referer') || null

  try {
    const body = bodySchema.parse(await req.json())
    slug = body.slug

    step = 'wake-db'
    // The DB is serverless and may be asleep. Block here until it answers
    // (cold start can take 10–30 s) so the rest of the checkout runs warm.
    const woke = await ensureDbAwake()
    if (woke.wokeUp) console.info('[single-checkout] db woke after', woke.waitedMs, 'ms')

    step = 'resolve-provider'
    const config = await withDbRetry(() => getPaymentConfig())
    const enabled = config.singleProviders
    provider = body.provider ?? enabled[0] ?? 'mercadopago'
    if (!enabled.includes(provider)) {
      return checkoutError('El método de pago no está disponible.', 'PROVIDER_DISABLED', step, { provider })
    }
    if (provider === 'stripe' && !await isStripeConfigured()) {
      return checkoutError('Stripe no está configurado en el servidor.', 'PROVIDER_NOT_CONFIGURED', step, { provider })
    }
    if (provider === 'mercadopago') await assertMercadoPagoConfigured()

    // Hash the validated, normalized purchase as well as the client UUID. A
    // changed destination/product/provider must never reopen a different purchase.
    const { idempotencyKey } = body
    const fingerprint = JSON.stringify({
      slug: body.slug, name: body.name, email: body.email || '', whatsapp: body.whatsapp, provider,
      address: {
        street: body.address.street, extNo: body.address.extNo, intNo: body.address.intNo || '',
        colonia: body.address.colonia, cp: body.address.cp, city: body.address.city,
        state: body.address.state, references: body.address.references || '',
      },
      isGift: body.isGift,
      giftMessage: body.isGift ? body.giftMessage || '' : '',
      recipientName: body.isGift ? body.recipientName || '' : '',
      needsCfdi: body.needsCfdi, cfdi: body.needsCfdi ? body.cfdi : undefined,
    })
    const paymentId = `cbc-retail-${createHash('sha256').update(idempotencyKey + ':' + fingerprint).digest('hex')}`
    const loadCheckout = () => db.payment.findUnique({
      where: { id: paymentId }, include: { order: { include: { quote: true } } },
    })
    let checkout = await loadCheckout()
    if (!checkout) {
      step = 'load-product'
      const product = await withDbRetry(() => db.product.findUnique({ where: { slug: body.slug } }))
      if (!product || !product.active) {
        console.warn('[single-checkout] product not found', JSON.stringify({ slug: body.slug, referer }))
        return checkoutError('Producto no encontrado.', 'PRODUCT_NOT_FOUND', step, { slug: body.slug })
      }

      step = 'price'
      const markupPct = await withDbRetry(() => getSingleMarkupPct())
      const goodsTotal = priceWithTax(product.price, markupPct)
      const ship = await withDbRetry(() => getRetailShippingQuote(goodsTotal))
      const orderTotal = Math.round((goodsTotal + ship.cost) * 100) / 100

      if (!Number.isFinite(orderTotal) || orderTotal <= 0) throw new Error('El precio del producto no es válido.')
      const orderCode = `CBC-${new Date().getFullYear()}-S-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`

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

      try {
        checkout = await db.$transaction(async tx => {
          step = 'create-lead'
          const lead = await tx.lead.create({
            data: { customerId: customer.id, source: 'single-purchase', boxType: 'single', quantity: 1 },
          })

          const items: Prisma.InputJsonValue[] = [
            { type: product.slug, name: product.name, qty: 1, unitPrice: goodsTotal, subtotal: goodsTotal },
          ]
          if (ship.cost > 0) items.push({ type: 'shipping', qty: 1, unitPrice: ship.cost, subtotal: ship.cost })

          step = 'create-quote'
          const quote = await tx.quote.create({
            data: {
              leadId: lead.id,
              customerId: customer.id,
              items,
              subtotal: priceBeforeTax(orderTotal),
              iva: taxAmount(orderTotal),
              total: orderTotal,
              status: 'Pendiente de pago',
            },
          })

          step = 'create-order'
          const order = await tx.order.create({
            data: {
              orderCode,
              quoteId: quote.id,
              customerId: customer.id,
              status: 'pending_payment',
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

          const payment = await tx.payment.create({
            data: { id: paymentId, orderId: order.id, provider, amount: orderTotal, currency: 'MXN', type: 'full', status: 'pending' },
          })
          return { ...payment, order: { ...order, quote } }
        })
      } catch (err) {
        // A concurrent request can win the unique Payment ID. Its transaction
        // committed the entire order; our losing transaction rolls back all rows.
        if (!(err && typeof err === 'object' && 'code' in err && err.code === 'P2002')) throw err
        checkout = await loadCheckout()
        if (!checkout) throw err
      }
    }
    if (!checkout) throw new Error('No se pudo recuperar el pedido.')
    const payment = checkout
    const order = checkout.order
    const orderCode = order.orderCode
    if (payment.status === 'paid') {
      return NextResponse.json({ ok: true, url: `/tracking/${encodeURIComponent(orderCode)}`, provider: payment.provider, orderCode })
    }
    if (!['pending', 'failed'].includes(payment.status)) {
      return checkoutError('Este intento de compra ya fue procesado. Revisa el estado de tu pedido.', 'PAYMENT_ALREADY_PROCESSED', step, { orderCode })
    }
    if (payment.paymentLinkUrl) {
      return NextResponse.json({ ok: true, url: payment.paymentLinkUrl, provider: payment.provider, orderCode })
    }
    // Retry with the persisted amounts and product label, even after catalog
    // prices or shipping rules change. The provider sees the same request.
    const productItem = (order.quote.items as { type: string; name?: string }[])[0]
    const product = { slug: productItem.type, name: productItem.name || productItem.type }
    const ship = { cost: order.shippingCost }
    const goodsTotal = Math.round((payment.amount - ship.cost) * 100) / 100

    // ── Provider branch ────────────────────────────────────────────────────
    const sharedMeta = {
      paymentId: payment.id,
      orderId: order.id,
      orderCode,
      type: 'full',
      customerId: order.customerId,
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

      const preference = await createMercadoPagoPreference({
        paymentId: payment.id, orderId: order.id, orderCode, type: 'full',
        items: mpItems,
        payer: { name: body.name, email: body.email || undefined },
        returnPath: `/productos/${encodeURIComponent(body.slug)}`,
        oxxoEnabled: config.oxxoEnabled, msiEnabled: config.msiEnabled,
      })
      checkoutUrl = preference.url
      externalId = preference.id
    }

    step = 'record-payment'
    await db.payment.update({
      where: { id: payment.id },
      data: {
        paymentLinkId: externalId,
        paymentLinkUrl: checkoutUrl,
      },
    })

    return NextResponse.json({ ok: true, url: checkoutUrl, provider, orderCode }, { status: 200 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.warn('[single-checkout] validation failed', JSON.stringify({ step, slug, referer, issues: err.flatten().fieldErrors }))
      return checkoutError(
        err.issues[0]?.message || 'Datos de compra inválidos. Revisa el formulario.',
        'VALIDATION_ERROR',
        step,
        { details: err.flatten().fieldErrors },
      )
    }

    // SDK errors may contain request headers and credentials. Log only a
    // stable diagnostic location; never serialize the provider exception.
    console.error('[single-checkout] FAILED', { route: 'POST /api/single-checkout', slug, provider, step })
    const message = step === 'wake-db'
      ? 'El servicio está iniciando. Vuelve a intentar en un momento.'
      : step === 'resolve-provider'
        ? 'El método de pago no está disponible en este momento.'
        : 'No se pudo iniciar el pago. Vuelve a intentar; conservaremos tu pedido.'
    return checkoutError(message, 'CHECKOUT_ERROR', step, { slug, provider })
  }
}
