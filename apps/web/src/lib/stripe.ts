import Stripe from 'stripe'
import { getIntegrationValue } from './integration-secrets'

// Resolve credentials per operation so editing or disabling a vault value
// takes effect immediately and unrelated routes can import this module safely.
export async function getStripe() {
  const key = await getIntegrationValue('STRIPE_SECRET_KEY')
  if (!key) throw new Error('Stripe no está configurado.')
  return new Stripe(key, { apiVersion: '2024-06-20', typescript: true })
}

export const isStripeConfigured = async () => !!await getIntegrationValue('STRIPE_SECRET_KEY')

/**
 * Stripe Checkout Session for a single storefront purchase (tax-inclusive
 * line items, hosted redirect). Dynamic payment methods are left on — no
 * `payment_method_types` — so card/OXXO/wallets are controlled from the
 * Stripe Dashboard.
 */
export async function createSingleCheckoutSession(opts: {
  slug: string
  customerEmail?: string | null
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
  metadata: Record<string, string>
}) {
  const stripe = await getStripe()
  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: opts.lineItems,
    customer_email: opts.customerEmail || undefined,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${opts.slug}?compra=exito&order=${opts.metadata.orderCode ?? ''}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${opts.slug}?compra=cancelado`,
    metadata: opts.metadata,
  }, { idempotencyKey: opts.metadata.paymentId ? `cbc-payment-${opts.metadata.paymentId}` : undefined })
}

export async function createPaymentLink(opts: {
  amount: number        // in MXN cents
  description: string
  customerId?: string   // Stripe customer ID
  metadata?: Record<string, string>
  allowOxxo?: boolean
}) {
  const stripe = await getStripe()
  const price = await stripe.prices.create({
    unit_amount: Math.round(opts.amount * 100), // convert to centavos
    currency: 'mxn',
    product_data: { name: opts.description },
  })

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    payment_method_types: opts.allowOxxo
      ? ['card', 'oxxo']
      : ['card'],
    metadata: opts.metadata ?? {},
    after_completion: {
      type: 'redirect',
      redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/pago/gracias` },
    },
  })

  return paymentLink
}

export async function getOrCreateStripeCustomer(opts: {
  email: string
  name: string
  whatsapp?: string
  stripeCustomerId?: string
}) {
  const stripe = await getStripe()
  if (opts.stripeCustomerId) {
    return stripe.customers.retrieve(opts.stripeCustomerId)
  }

  return stripe.customers.create({
    email: opts.email,
    name: opts.name,
    phone: opts.whatsapp,
    metadata: { source: 'cbc-platform' },
  })
}
