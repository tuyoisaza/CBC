import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { createPaymentLink, getOrCreateStripeCustomer } from '@/lib/stripe'
import { notifyCustomerOrderStatus, sendPaymentLinkToCustomer, notifyLorenaPayment } from '@/lib/notifications'

// Convert accepted quote → order
const createOrderSchema = z.object({
  quoteId: z.string(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { quoteId } = createOrderSchema.parse(await req.json())

  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: { customer: true, lead: true, order: true },
  })
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  if (quote.order) return NextResponse.json({ error: 'Order already exists' }, { status: 409 })

  // Order code
  const count = await db.order.count()
  const orderCode = `CBC-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

  // Create Stripe customer
  const stripeCustomer = await getOrCreateStripeCustomer({
    email:            quote.customer.email || '',
    name:             quote.customer.companyName,
    whatsapp:         quote.customer.whatsapp || undefined,
    stripeCustomerId: quote.customer.stripeCustomerId || undefined,
  })

  // Update customer with Stripe ID
  if (!quote.customer.stripeCustomerId) {
    await db.customer.update({
      where: { id: quote.customerId },
      data:  { stripeCustomerId: (stripeCustomer as any).id },
    })
  }

  // Create order
  const order = await db.order.create({
    data: {
      orderCode,
      quoteId,
      customerId: quote.customerId,
      status:     'confirmed',
    },
  })

  // Generate deposit payment link (50%)
  const depositAmount = Math.round(quote.total * 0.5 * 100) / 100
  const depositLink = await createPaymentLink({
    amount:      depositAmount,
    description: `CBC ${orderCode} — Anticipo 50%`,
    metadata: {
      orderId:     order.id,
      orderCode,
      type:        'deposit',
      customerId:  quote.customerId,
    },
    allowOxxo: true,
  })

  // Save payment record
  await db.payment.create({
    data: {
      orderId:        order.id,
      amount:         depositAmount,
      currency:       'MXN',
      type:           'deposit',
      status:         'pending',
      paymentLinkId:  depositLink.id,
      paymentLinkUrl: depositLink.url,
    },
  })

  // Send payment link to customer
  await sendPaymentLinkToCustomer({
    whatsapp:   quote.customer.whatsapp || '',
    email:      quote.customer.email || '',
    companyName: quote.customer.companyName,
    orderCode,
    amount:      depositAmount,
    type:        'deposit',
    paymentUrl:  depositLink.url,
  })

  // Update quote status
  await db.quote.update({ where: { id: quoteId }, data: { status: 'accepted' } })

  return NextResponse.json({ order, paymentLink: depositLink.url }, { status: 201 })
}

// Update order status
const patchSchema = z.object({
  status:        z.enum(['confirmed','in_production','ready','shipped','delivered','cancelled']).optional(),
  trackingNumber: z.string().optional(),
  carrier:        z.string().optional(),
  notes:          z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url   = new URL(req.url)
  const orderId = url.searchParams.get('id')
  if (!orderId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const data  = patchSchema.parse(await req.json())
  const order = await db.order.update({
    where:   { id: orderId },
    data,
    include: { customer: true },
  })

  // Notify customer on every status change
  if (data.status && order.customer.whatsapp) {
    await notifyCustomerOrderStatus({
      whatsapp:      order.customer.whatsapp,
      orderCode:     order.orderCode,
      status:        data.status,
      trackingNumber: data.trackingNumber,
    })
  }

  return NextResponse.json(order)
}
