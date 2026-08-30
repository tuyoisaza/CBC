import Stripe from 'stripe'

// Fall back to a placeholder so importing this module never throws when the key
// is unset — callers that actually hit the API get a catchable 401 instead of a
// module-load crash that would 500 unrelated routes (e.g. the Mercado Pago path
// in /api/single-checkout).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_missing_stripe_secret_key', {
  apiVersion: '2024-06-20',
  typescript: true,
})

export const isStripeConfigured = () => !!process.env.STRIPE_SECRET_KEY

/**
 * Stripe Checkout Session for a single storefront purchase (tax-inclusive,
 * one line item, hosted redirect). Dynamic payment methods are left on — no
 * `payment_method_types` — so card/OXXO/wallets are controlled from the
 * Stripe Dashboard.
 */
export async function createSingleCheckoutSession(opts: {
  amount: number // MXN, final tax-inclusive price
  productName: string
  slug: string
  customerEmail?: string | null
  metadata: Record<string, string>
}) {
  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          unit_amount: Math.round(opts.amount * 100),
          product_data: { name: opts.productName },
        },
        quantity: 1,
      },
    ],
    customer_email: opts.customerEmail || undefined,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${opts.slug}?compra=exito`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${opts.slug}?compra=cancelado`,
    metadata: opts.metadata,
  })
}

export async function createPaymentLink(opts: {
  amount: number        // in MXN cents
  description: string
  customerId?: string   // Stripe customer ID
  metadata?: Record<string, string>
  allowOxxo?: boolean
}) {
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
