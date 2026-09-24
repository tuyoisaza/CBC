import { db } from '@/lib/db'
import type { PaymentProvider } from '@/lib/payment-config'
import { ensureBalancePayment } from '@/lib/order-payments'
import { notifyLorenaPayment, notifyLorenaRetailOrder, sendOrderConfirmationToCustomer } from '@/lib/notifications'

export class PaymentMismatchError extends Error {}

export type VerifiedPayment = {
  provider: PaymentProvider
  externalId: string
  amount: number
  currency: string
}

export function assertPaymentMatches(
  payment: { provider: string; amount: number; currency: string }, received: VerifiedPayment,
) {
  if (payment.provider !== received.provider ||
      payment.currency.toUpperCase() !== received.currency.toUpperCase() ||
      !Number.isFinite(received.amount) || received.amount <= 0 ||
      Math.round(payment.amount * 100) !== Math.round(received.amount * 100)) {
    throw new PaymentMismatchError('Payment provider, currency or amount does not match the order')
  }
}

/** Commit money and fulfillment together. A failed order write rolls back payment too. */
export async function settlePayment(paymentId: string, received: VerifiedPayment) {
  const result = await db.$transaction(async tx => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new Error('Payment not found')
    assertPaymentMatches(payment, received)
    if (!['full', 'deposit', 'balance'].includes(payment.type)) throw new PaymentMismatchError('Unknown payment type')
    if (payment.status === 'paid') {
      if (payment.stripePaymentId !== received.externalId) throw new PaymentMismatchError('A different payment already settled this order')
      return { payment, changed: false }
    }
    if (!['pending', 'failed'].includes(payment.status)) return { payment, changed: false }
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ['pending', 'failed'] } },
      data: { status: 'paid', paidAt: new Date(), stripePaymentId: received.externalId },
    })
    if (count === 0) return { payment, changed: false }
    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } })
    // Do not move shipped/delivered orders backwards on delayed notifications.
    if (['pending_payment', 'confirmed', 'in_production'].includes(order.status)) {
      await tx.order.update({ where: { id: order.id },
        data: { status: payment.type === 'balance' ? 'ready' : 'in_production' } })
    }
    await tx.quote.update({ where: { id: order.quoteId },
      data: { status: payment.type === 'deposit' ? 'Anticipo pagado' : 'Pagado' } })
    return { payment: { ...payment, status: 'paid' }, changed: true }
  })

  const ensureBalance = async () => {
    if (result.payment.type === 'deposit' && result.payment.status === 'paid') {
      await ensureBalancePayment(result.payment.orderId, received.provider)
    }
  }
  // Retry balance creation after a provider outage, without repeating messages.
  if (!result.changed) {
    await ensureBalance()
    return { alreadyProcessed: true }
  }
  const order = await db.order.findUniqueOrThrow({
    where: { id: result.payment.orderId }, include: { customer: true },
  })
  // Messaging is best-effort; it must never roll back an accredited payment.
  if (result.payment.type === 'full') {
    await Promise.allSettled([
      notifyLorenaRetailOrder({
        orderCode: order.orderCode, customerName: order.customer.contactName || order.customer.companyName,
        amount: received.amount, shippingCity: order.shippingCity || '—',
        isGift: order.isGift, giftMessage: order.giftMessage, recipientName: order.recipientName, needsCfdi: order.needsCfdi,
      }),
      sendOrderConfirmationToCustomer({
        whatsapp: order.customer.whatsapp || '', email: order.customer.email || '',
        name: order.customer.contactName || order.customer.companyName,
        orderCode: order.orderCode, amount: received.amount, isGift: order.isGift,
      }),
    ]).then(results => results.forEach(result => {
      if (result.status === 'rejected') console.error('[payments] Notification failed', order.orderCode, result.reason)
    }))
  } else {
    await notifyLorenaPayment({
      companyName: order.customer.companyName, orderCode: order.orderCode,
      amount: received.amount, type: result.payment.type as 'deposit' | 'balance',
    }).catch(error => console.error('[payments] Notification failed', order.orderCode, error))
  }
  await ensureBalance()
  return { alreadyProcessed: false }
}
