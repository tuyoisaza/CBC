import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { notifyLorenaPayment, sendPaymentLinkToCustomer } from '@/lib/notifications'
import { createPaymentLink } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta    = session.metadata ?? {}

    if (meta.orderId && meta.type) {
      const type = meta.type as 'deposit' | 'balance' | 'full'
      if (type === 'full') {
        await handleSinglePurchase({
          orderId:   meta.orderId,
          orderCode: meta.orderCode,
          amount:    (session.amount_total ?? 0) / 100,
          stripeId:  session.payment_intent as string,
        })
      } else {
        await handlePaymentReceived({
          orderId:    meta.orderId,
          orderCode:  meta.orderCode,
          customerId: meta.customerId,
          type:       type as 'deposit' | 'balance',
          amount:     (session.amount_total ?? 0) / 100,
          stripeId:   session.payment_intent as string,
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}

async function handleSinglePurchase(opts: {
  orderId:   string
  orderCode: string
  amount:    number
  stripeId:  string
}) {
  await db.payment.updateMany({
    where: { orderId: opts.orderId, type: 'full', status: 'pending' },
    data:  { status: 'paid', paidAt: new Date(), stripePaymentId: opts.stripeId },
  })

  await db.order.update({
    where: { id: opts.orderId },
    data:  { status: 'in_production' },
  })

  const order = await db.order.findUnique({
    where: { id: opts.orderId },
    include: { customer: true },
  })
  if (order) {
    await notifyLorenaPayment({
      companyName: order.customer.companyName,
      orderCode:   opts.orderCode,
      amount:      opts.amount,
      type:        'full',
    })
  }
}

async function handlePaymentReceived(opts: {
  orderId:    string
  orderCode:  string
  customerId: string
  type:       'deposit' | 'balance'
  amount:     number
  stripeId:   string
}) {
  // Mark payment as paid
  await db.payment.updateMany({
    where: { orderId: opts.orderId, type: opts.type, status: 'pending' },
    data:  { status: 'paid', paidAt: new Date(), stripePaymentId: opts.stripeId },
  })

  // Get order + customer
  const order = await db.order.findUnique({
    where:   { id: opts.orderId },
    include: { customer: true, quote: true },
  })
  if (!order) return

  // Notify Lorena
  await notifyLorenaPayment({
    companyName: order.customer.companyName,
    orderCode:   opts.orderCode,
    amount:      opts.amount,
    type:        opts.type,
  })

  if (opts.type === 'deposit') {
    // Move order to in_production
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

    // Store balance link — will be sent when order is ready
    await db.order.update({
      where: { id: opts.orderId },
      data:  { notes: `Balance link: ${balanceLink.url}` },
    })

  } else if (opts.type === 'balance') {
    // Full payment received — trigger CFDI generation
    await db.order.update({
      where: { id: opts.orderId },
      data:  { status: 'ready' },
    })

    // CFDI generation is triggered from admin or automatically
    // via /api/admin/cfdi when both payments are confirmed
  }
}
