import { db } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { createMercadoPagoPreference } from '@/lib/mercadopago'
import { getPaymentConfig, type PaymentProvider } from '@/lib/payment-config'
import { sendPaymentLinkToCustomer } from '@/lib/notifications'

const money = (amount: number) => Math.round(amount * 100) / 100

export function depositAmount(total: number, advancePct: number): number {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(advancePct) || advancePct <= 0 || advancePct > 100) {
    throw new Error('La cotización debe tener un total positivo y un anticipo entre 0 y 100%.')
  }
  const amount = money(total * advancePct / 100)
  if (amount <= 0) throw new Error('El anticipo debe ser mayor a cero.')
  return amount
}

/** Persist the payment first so a provider failure can be retried safely. */
export async function ensureOrderPayment(orderId: string, provider: PaymentProvider, type: 'deposit' | 'balance', amount: number) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: true } })
  if (!order) throw new Error('Pedido no encontrado.')
  if (!Number.isFinite(amount) || money(amount) <= 0) throw new Error('Importe de pago inválido.')

  // Preserve previously issued links, including payments created before deterministic IDs.
  const existing = await db.payment.findFirst({ where: { orderId, type, status: { in: ['pending', 'paid'] } }, orderBy: { createdAt: 'asc' } })
  const payment = existing ?? await db.payment.upsert({
    where: { id: `cbc-${type}-${orderId}` },
    update: {},
    create: { id: `cbc-${type}-${orderId}`, orderId, provider, amount: money(amount), currency: 'MXN', type, status: 'pending' },
  })
  if (payment.status === 'paid' || payment.paymentLinkUrl) return payment
  if (payment.status !== 'pending') throw new Error('El pago ya no está pendiente. Revisa su estado antes de generar otro cobro.')
  if (payment.provider !== 'stripe' && payment.provider !== 'mercadopago') throw new Error('Proveedor de pago inválido.')

  const config = await getPaymentConfig()
  const title = `CBC ${order.orderCode} — ${type === 'deposit' ? 'Anticipo' : 'Saldo final'}`
  const returnPath = `/tracking/${encodeURIComponent(order.orderCode)}`
  let link: { id: string; url: string }
  if (payment.provider === 'mercadopago') {
    link = await createMercadoPagoPreference({
      paymentId: payment.id, orderId, orderCode: order.orderCode, type,
      items: [{ id: payment.id, title, quantity: 1, unit_price: payment.amount }],
      payer: { name: order.customer.contactName || order.customer.companyName, email: order.customer.email || undefined },
      returnPath, oxxoEnabled: config.oxxoEnabled, msiEnabled: config.msiEnabled,
    })
  } else {
    const stripe = await getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL no está configurada.')
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: order.customer.email || undefined,
      line_items: [{ price_data: { currency: 'mxn', unit_amount: Math.round(payment.amount * 100), product_data: { name: title } }, quantity: 1 }],
      metadata: { paymentId: payment.id, orderId, orderCode: order.orderCode, type, customerId: order.customerId },
      success_url: `${appUrl}${returnPath}`,
      cancel_url: `${appUrl}${returnPath}`,
    }, { idempotencyKey: `cbc-payment-${payment.id}` })
    if (!session.url) throw new Error('Stripe no devolvió un enlace de pago.')
    link = { id: session.id, url: session.url }
  }
  return db.payment.update({ where: { id: payment.id }, data: { paymentLinkId: link.id, paymentLinkUrl: link.url } })
}

/** Retrying a deposit webhook repairs a missing balance link instead of charging twice. */
export async function ensureBalancePayment(orderId: string, provider: PaymentProvider) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { quote: true, payments: true } })
  if (!order) throw new Error('Pedido no encontrado.')
  if (!order.payments.some(p => p.type === 'deposit' && p.status === 'paid')) return null
  const paid = order.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  const remaining = money(order.quote.total - paid)
  if (remaining <= 0) return null
  const hadLink = order.payments.some(p => p.type === 'balance' && p.status === 'pending' && p.paymentLinkUrl)
  const payment = await ensureOrderPayment(orderId, provider, 'balance', remaining)
  if (!hadLink && payment.status === 'pending' && payment.paymentLinkUrl) {
    const customer = await db.customer.findUnique({ where: { id: order.customerId } })
    if (customer) await sendPaymentLinkToCustomer({
      whatsapp: customer.whatsapp || '', email: customer.email || '',
      companyName: customer.companyName, orderCode: order.orderCode,
      amount: payment.amount, type: 'balance', paymentUrl: payment.paymentLinkUrl,
    }).catch(() => console.error('[order-payments] Balance notification failed', orderId))
  }
  return payment
}
