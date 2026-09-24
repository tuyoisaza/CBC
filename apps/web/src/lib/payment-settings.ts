/** Browser-safe payment settings; credentials and database access stay server-side. */
export type PaymentProvider = 'stripe' | 'mercadopago'

export const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: 'Stripe',
  mercadopago: 'Mercado Pago',
}

export const PAYMENTS_SINGLE_PROVIDERS_KEY = 'payments_single_providers'
export const PAYMENTS_B2B_PROVIDER_KEY = 'payments_b2b_provider'
export const PAYMENTS_OXXO_KEY = 'payments_oxxo_enabled'
export const PAYMENTS_MSI_KEY = 'payments_msi_enabled'

export type PaymentConfig = {
  singleProviders: PaymentProvider[]
  b2bProvider: PaymentProvider
  oxxoEnabled: boolean
  /** Allow up to 12 installments; interest depends on the merchant account. */
  msiEnabled: boolean
}
