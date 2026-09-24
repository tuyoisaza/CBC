import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getIntegrationValue } from '@/lib/integration-secrets'
import { db } from '@/lib/db'
import { failSinglePurchase } from '@/lib/fulfillment'
import { settlePayment } from '@/lib/payment-settlement'
import Stripe from 'stripe'

// A completed Checkout Session isn't necessarily paid: for delayed-notification
// methods (OXXO, SPEI) `checkout.session.completed` fires while payment_status is
// still 'unpaid', and the money is only confirmed later via
// `checkout.session.async_payment_succeeded`. Fulfilling on 'completed' alone
// would grant orders that never get paid and miss the ones that do.
const SUCCESS_EVENTS = new Set<Stripe.Event['type']>([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
])

function isPaid(session: Stripe.Checkout.Session) {
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let secret: string | undefined
  let stripe: Stripe
  try {
    secret = await getIntegrationValue('STRIPE_WEBHOOK_SECRET')
    if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    stripe = await getStripe()
  } catch { return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 }) }
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (SUCCESS_EVENTS.has(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session
    const meta    = session.metadata ?? {}

    if (!isPaid(session)) {
      // OXXO/SPEI voucher issued — wait for async_payment_succeeded.
      return NextResponse.json({ received: true, skipped: 'awaiting_payment' })
    }

    if (meta.orderId && meta.type) {
      const amount   = (session.amount_total ?? 0) / 100
      const stripeId = (session.payment_intent as string) || session.id

      const payment = meta.paymentId
        ? await db.payment.findUnique({ where: { id: meta.paymentId } })
        : await db.payment.findFirst({ where: {
            orderId: meta.orderId, type: meta.type,
            OR: [{ provider: 'stripe' }, ...(typeof session.payment_link === 'string'
              ? [{ paymentLinkId: session.payment_link }] : [])],
          } })
      if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 503 })
      // Older B2B Stripe links were stored with the schema's MP default. Only
      // repair when the signed Stripe event identifies that exact stored link.
      if (payment.provider !== 'stripe' && typeof session.payment_link === 'string' &&
          payment.paymentLinkId === session.payment_link) {
        await db.payment.update({ where: { id: payment.id }, data: { provider: 'stripe' } })
      }
      await settlePayment(payment.id, {
        provider: 'stripe', externalId: stripeId, amount, currency: session.currency || '',
      })
    }
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta    = session.metadata ?? {}
    if (meta.orderId && meta.type === 'full') {
      await failSinglePurchase(meta.orderId, meta.paymentId)
    }
  }

  return NextResponse.json({ received: true })
}
