import { db } from '@/lib/db'

/** A failed Stripe attempt cannot cancel another provider's paid order. */
export async function failSinglePurchase(orderId: string, paymentId?: string): Promise<void> {
  await db.payment.updateMany({
    where: { ...(paymentId ? { id: paymentId } : {}), orderId, provider: 'stripe', type: 'full', status: 'pending' },
    data: { status: 'failed' },
  })
}
