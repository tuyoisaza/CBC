import { NextRequest, NextResponse } from 'next/server'
import { Payment, Preference } from 'mercadopago'
import { mercadopagoClient } from '@/lib/mercadopago'
import { db } from '@/lib/db'
import { notifyLorenaPayment } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const paymentId = body.data?.id
    if (!paymentId || body.type !== 'payment') {
      return NextResponse.json({ received: true })
    }

    const payment = await new Payment(mercadopagoClient).get({ id: paymentId })

    if (payment.status === 'approved') {
      const orderId = payment.external_reference
      if (!orderId) return NextResponse.json({ received: true })

      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { customer: true },
      })
      if (!order) return NextResponse.json({ received: true })

      await db.payment.updateMany({
        where: { orderId, type: 'full', status: 'pending' },
        data: { status: 'paid', paidAt: new Date(), stripePaymentId: String(paymentId) },
      })

      await db.order.update({
        where: { id: orderId },
        data: { status: 'in_production' },
      })

      await notifyLorenaPayment({
        companyName: order.customer.companyName,
        orderCode:   order.orderCode,
        amount:      payment.transaction_amount ?? 0,
        type:        'full',
      })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Mercado Pago webhook error', err)
    return NextResponse.json({ received: true })
  }
}
