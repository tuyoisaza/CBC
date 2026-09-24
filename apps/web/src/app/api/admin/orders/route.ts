import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { notifyCustomerOrderStatus, sendPaymentLinkToCustomer } from '@/lib/notifications'
import { getPaymentConfig } from '@/lib/payment-config'
import { depositAmount, ensureOrderPayment } from '@/lib/order-payments'

const createOrderSchema = z.object({
  quoteId: z.string().min(1),
  provider: z.enum(['stripe', 'mercadopago']).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { quoteId, provider: requestedProvider } = createOrderSchema.parse(await req.json())
    const quote = await db.quote.findUnique({ where: { id: quoteId }, include: { customer: true } })
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    let amount: number
    try {
      amount = depositAmount(quote.total, quote.advancePct)
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 422 })
    }
    const config = await getPaymentConfig()
    const provider = requestedProvider ?? config.b2bProvider
    // quoteId is unique, so concurrent requests reuse the same order.
    const order = await db.order.upsert({
      where: { quoteId }, update: {},
      create: {
        quoteId, customerId: quote.customerId, status: 'pending_payment', channel: 'b2b',
        orderCode: `CBC-${new Date().getFullYear()}-${quote.id.toUpperCase()}`,
      },
    })
    if (order.channel !== 'b2b') return NextResponse.json({ error: 'Los pedidos de compra individual no admiten anticipos B2B.' }, { status: 409 })
    if (order.status === 'cancelled') return NextResponse.json({ error: 'El pedido está cancelado.' }, { status: 409 })
    // An existing pending payment retains its original provider and amount.
    const payment = await ensureOrderPayment(order.id, provider, 'deposit', amount)
    if (payment.status === 'pending') {
      await db.quote.updateMany({ where: { id: quoteId, status: { in: ['Cotización creada', 'draft', 'sent', 'accepted', 'Pendiente de pago'] } }, data: { status: 'Pendiente de pago' } })
    }
    if (payment.status === 'pending' && payment.paymentLinkUrl) {
      await sendPaymentLinkToCustomer({
        whatsapp: quote.customer.whatsapp || '', email: quote.customer.email || '',
        companyName: quote.customer.companyName, orderCode: order.orderCode,
        amount: payment.amount, type: 'deposit', paymentUrl: payment.paymentLinkUrl,
      }).catch(error => console.error('[orders] payment notification failed', order.id, error))
    }
    return NextResponse.json({ order, paymentLink: payment.paymentLinkUrl, provider: payment.provider, paymentStatus: payment.status })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Solicitud inválida', details: error.errors }, { status: 400 })
    console.error('[orders] failed to prepare deposit', error)
    return NextResponse.json({ error: 'No se pudo preparar el pago. Puedes reintentar sin crear otro pedido.' }, { status: 502 })
  }
}
// Update order status
const patchSchema = z.object({
  status:        z.enum(['pending_payment','confirmed','in_production','ready','shipped','delivered','cancelled']).optional(),
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
