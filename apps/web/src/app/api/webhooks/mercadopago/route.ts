import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMercadoPagoPayment, isMercadoPagoTestMode, verifyMercadoPagoSignature } from '@/lib/mercadopago'
import { assertPaymentMatches, PaymentMismatchError, settlePayment } from '@/lib/payment-settlement'
import { getIntegrationValues } from '@/lib/integration-secrets'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let config: Record<string, string | undefined>
  try { config = await getIntegrationValues(['MERCADOPAGO_WEBHOOK_SECRET', 'MERCADOPAGO_ACCESS_TOKEN']) }
  catch { return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 }) }
  const secret = config.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret || !config.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }
  const id = req.nextUrl.searchParams.get('data.id')
  if (!verifyMercadoPagoSignature({
    dataId: id, requestId: req.headers.get('x-request-id'),
    signature: req.headers.get('x-signature'), secret,
  })) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  let body: { type?: string; data?: { id?: string | number } }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || body.type !== 'payment') return NextResponse.json({ received: true, ignored: true })
  if (!id || !/^\d+$/.test(id) || String(body.data?.id) !== id) {
    return NextResponse.json({ error: 'Payment ID mismatch' }, { status: 400 })
  }
  try {
    // Read authoritative payment data, never trust status/amount from the notification.
    const remote = await getMercadoPagoPayment(id)
    if (String(remote.id) !== id || remote.live_mode !== !await isMercadoPagoTestMode()) {
      throw new PaymentMismatchError('Payment ID or environment mismatch')
    }
    const reference = remote.external_reference
    if (!reference) return NextResponse.json({ received: true, ignored: true })
    const payment = await db.payment.findUnique({ where: { id: reference } }) ??
      // Compatibility for old preferences whose reference was the order ID.
      await db.payment.findFirst({ where: { orderId: reference, provider: 'mercadopago', type: 'full' } })
    if (!payment) return NextResponse.json({ received: true, ignored: true })
    const received = {
      provider: 'mercadopago' as const, externalId: id,
      amount: remote.transaction_amount ?? NaN, currency: remote.currency_id ?? '',
    }
    assertPaymentMatches(payment, received)
    if (remote.status === 'approved') {
      await settlePayment(payment.id, received)
    } else if (remote.status === 'rejected' || remote.status === 'cancelled') {
      // Buyers may retry a preference; a failed attempt cannot undo an approval.
      await db.payment.updateMany({
        where: { id: payment.id, status: 'pending' }, data: { status: 'failed' },
      })
    } else if (remote.status === 'refunded' || remote.status === 'charged_back') {
      await db.payment.updateMany({
        where: { id: payment.id, status: 'paid', stripePaymentId: id },
        data: { status: remote.status },
      })
      console.warn('[mercadopago] Payment reversal requires review', { paymentId: payment.id, status: remote.status })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[mercadopago] Webhook processing failed', { paymentId: id })
    return NextResponse.json({ error: error instanceof PaymentMismatchError ? 'Payment mismatch' : 'Processing failed' },
      { status: error instanceof PaymentMismatchError ? 400 : 503 })
  }
}
