import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { notifyLorenaPayment } from '@/lib/notifications'
import { createPaymentLink } from '@/lib/stripe'
import { fulfillSinglePurchase, failSinglePurchase } from '@/lib/fulfillment'
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

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
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

      if (meta.type === 'full') {
        await fulfillSinglePurchase(meta.orderId, { externalId: stripeId, amount })
      } else if (meta.type === 'deposit' || meta.type === 'balance') {
        await handlePaymentReceived({
          orderId:    meta.orderId,
          orderCode:  meta.orderCode,
          customerId: meta.customerId,
          type:       meta.type,
          amount,
          stripeId,
        })
      }
    }
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta    = session.metadata ?? {}
    if (meta.orderId && meta.type === 'full') {
      await failSinglePurchase(meta.orderId)
    }
  }

  return NextResponse.json({ received: true })
}

async function handlePaymentReceived(opts: {
  orderId:    string
  orderCode:  string
  customerId: string
  type:       'deposit' | 'balance'
  amount:     number
  stripeId:   string
}) {
  // Idempotency: only proceed if this payment was still pending.
  const { count } = await db.payment.updateMany({
    where: { orderId: opts.orderId, type: opts.type, status: 'pending' },
    data:  { status: 'paid', paidAt: new Date(), stripePaymentId: opts.stripeId },
  })
  if (count === 0) return

  const order = await db.order.findUnique({
    where:   { id: opts.orderId },
    include: { customer: true, quote: true },
  })
  if (!order) return

  await notifyLorenaPayment({
    companyName: order.customer.companyName,
    orderCode:   opts.orderCode,
    amount:      opts.amount,
    type:        opts.type,
  })

  if (opts.type === 'deposit') {
    await db.order.update({
      where: { id: opts.orderId },
      data:  { status: 'in_production' },
    })

    // Generate balance payment link (remaining 50%)
    const balanceAmount = Math.round(order.quote.total * 0.5 * 100) / 100
    const balanceLink   = await createPaymentLink({
      amount:      balanceAmount,
      description: `CBC ${opts.orderCode} — Saldo final 50%`,
      metadata: {
        orderId:    opts.orderId,
        orderCode:  opts.orderCode,
        type:       'balance',
        customerId: opts.customerId,
      },
      allowOxxo: true,
    })

    await db.payment.create({
      data: {
        orderId:        opts.orderId,
        amount:         balanceAmount,
        currency:       'MXN',
        type:           'balance',
        status:         'pending',
        paymentLinkId:  balanceLink.id,
        paymentLinkUrl: balanceLink.url,
      },
    })

    await db.order.update({
      where: { id: opts.orderId },
      data:  { notes: `Balance link: ${balanceLink.url}` },
    })
  } else if (opts.type === 'balance') {
    await db.order.update({
      where: { id: opts.orderId },
      data:  { status: 'ready' },
    })
  }
}
