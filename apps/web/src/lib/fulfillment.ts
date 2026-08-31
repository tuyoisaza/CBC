import { db } from '@/lib/db'
import { notifyLorenaRetailOrder, sendOrderConfirmationToCustomer } from '@/lib/notifications'

type FulfillResult = { alreadyProcessed: boolean }

/**
 * Mark a retail single-purchase (`Payment.type = 'full'`) as paid and run the
 * side effects exactly once.
 *
 * Idempotent: the `status: 'pending'` filter on updateMany means a redelivered
 * webhook updates 0 rows — we detect that and skip the notifications so the
 * customer and Lorena aren't messaged twice.
 *
 * Notifications are best-effort: a failing WhatsApp/email is logged, not thrown,
 * so the webhook still returns 200 and Stripe/MP don't retry (which the guard
 * above would absorb anyway, but this avoids the noise).
 */
export async function fulfillSinglePurchase(
  orderId: string,
  opts: { externalId: string; amount: number },
): Promise<FulfillResult> {
  const { count } = await db.payment.updateMany({
    where: { orderId, type: 'full', status: 'pending' },
    data: { status: 'paid', paidAt: new Date(), stripePaymentId: opts.externalId },
  })
  if (count === 0) return { alreadyProcessed: true }

  await db.order.update({ where: { id: orderId }, data: { status: 'in_production' } })

  const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: true } })
  if (!order) return { alreadyProcessed: false }

  const shipping = (order.shipping ?? {}) as Record<string, unknown>

  await notifyLorenaRetailOrder({
    orderCode: order.orderCode,
    customerName: order.customer.contactName || order.customer.companyName,
    amount: opts.amount,
    shippingCity: order.shippingCity || (shipping.city as string) || '—',
    isGift: order.isGift,
    giftMessage: order.giftMessage,
    recipientName: order.recipientName,
    needsCfdi: order.needsCfdi,
  }).catch((e) => console.error('[fulfill] lorena notify failed', order.orderCode, e))

  await sendOrderConfirmationToCustomer({
    whatsapp: order.customer.whatsapp || '',
    email: order.customer.email || '',
    name: order.customer.contactName || order.customer.companyName,
    orderCode: order.orderCode,
    amount: opts.amount,
    isGift: order.isGift,
  }).catch((e) => console.error('[fulfill] customer confirm failed', order.orderCode, e))

  return { alreadyProcessed: false }
}

/** Payment failed after the session completed (e.g. an OXXO voucher expired). */
export async function failSinglePurchase(orderId: string): Promise<void> {
  const { count } = await db.payment.updateMany({
    where: { orderId, type: 'full', status: 'pending' },
    data: { status: 'failed' },
  })
  if (count === 0) return
  await db.order
    .update({ where: { id: orderId }, data: { status: 'cancelled' } })
    .catch((e) => console.error('[fulfill] mark order cancelled failed', orderId, e))
}
