import { NextRequest, NextResponse } from 'next/server'
import { Payment } from 'mercadopago'
import { mercadopagoClient } from '@/lib/mercadopago'
import { db } from '@/lib/db'
import { fulfillSinglePurchase } from '@/lib/fulfillment'

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

      await fulfillSinglePurchase(orderId, {
        externalId: String(paymentId),
        amount: payment.transaction_amount ?? 0,
      })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Mercado Pago webhook error', err)
    return NextResponse.json({ received: true })
  }
}
