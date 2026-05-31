import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

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
