import { db } from '@/lib/db'

/**
 * Payment provider configuration.
 *
 * SECRETS (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MERCADOPAGO_ACCESS_TOKEN, …)
 * live ONLY in environment variables (Railway → Variables). They are never
 * stored in the DB or entered through the admin UI. This module only handles
 * non-secret, operator-tunable config (which providers the storefront offers,
 * OXXO/MSI toggles) and read-only status probes.
 */

export type PaymentProvider = 'stripe' | 'mercadopago'

export const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  stripe: 'Stripe',
  mercadopago: 'Mercado Pago',
}

// Setting keys (stored in the `Setting` table, plaintext, non-secret)
export const PAYMENTS_SINGLE_PROVIDERS_KEY = 'payments_single_providers'
export const PAYMENTS_OXXO_KEY = 'payments_oxxo_enabled'
export const PAYMENTS_MSI_KEY = 'payments_msi_enabled'

export type PaymentConfig = {
  /** Providers offered on the storefront "Comprar 1" single-purchase flow. */
  singleProviders: PaymentProvider[]
  /** Offer OXXO cash vouchers (Mercado Pago). */
  oxxoEnabled: boolean
  /** Offer meses sin intereses / installments (Mercado Pago). */
  msiEnabled: boolean
}

// Defaults match today's hard-coded behaviour: single-checkout uses Mercado
// Pago, OXXO is allowed on B2B payment links, MSI is off.
const DEFAULTS: PaymentConfig = {
  singleProviders: ['mercadopago'],
  oxxoEnabled: true,
  msiEnabled: false,
}

function parseProviders(raw: string | undefined): PaymentProvider[] {
  if (!raw) return DEFAULTS.singleProviders
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return DEFAULTS.singleProviders
    const valid = arr.filter((p): p is PaymentProvider => p === 'stripe' || p === 'mercadopago')
    return valid.length ? valid : DEFAULTS.singleProviders
  } catch {
    return DEFAULTS.singleProviders
  }
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const rows = await db.setting.findMany({
    where: { key: { in: [PAYMENTS_SINGLE_PROVIDERS_KEY, PAYMENTS_OXXO_KEY, PAYMENTS_MSI_KEY] } },
  })
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return {
    singleProviders: parseProviders(map[PAYMENTS_SINGLE_PROVIDERS_KEY]),
    oxxoEnabled: map[PAYMENTS_OXXO_KEY] ? map[PAYMENTS_OXXO_KEY] === 'true' : DEFAULTS.oxxoEnabled,
    msiEnabled: map[PAYMENTS_MSI_KEY] ? map[PAYMENTS_MSI_KEY] === 'true' : DEFAULTS.msiEnabled,
  }
}

// ─── Status probes ───────────────────────────────────────────────────────────

export type ProviderMode = 'live' | 'test' | null

export type ProviderStatus = {
  provider: PaymentProvider
  configured: boolean
  mode: ProviderMode
  ok: boolean
  message: string
  account?: string
}

function stripeMode(key: string): ProviderMode {
  if (key.includes('_live_')) return 'live'
  if (key.includes('_test_')) return 'test'
  return null
}

export async function checkStripeStatus(): Promise<ProviderStatus> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return { provider: 'stripe', configured: false, mode: null, ok: false, message: 'STRIPE_SECRET_KEY no está configurada en Railway.' }
  }
  const mode = stripeMode(key)
  try {
    const { stripe } = await import('@/lib/stripe')
    const account = await stripe.accounts.retrieve()
    return {
      provider: 'stripe',
      configured: true,
      mode,
      ok: true,
      message: 'Conexión con Stripe correcta.',
      account: account.settings?.dashboard?.display_name || account.email || account.id,
    }
  } catch (e) {
    return {
      provider: 'stripe',
      configured: true,
      mode,
      ok: false,
      message: `Stripe respondió con error: ${(e as Error).message}`,
    }
  }
}

export async function checkMercadoPagoStatus(): Promise<ProviderStatus> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) {
    return { provider: 'mercadopago', configured: false, mode: null, ok: false, message: 'MERCADOPAGO_ACCESS_TOKEN no está configurada en Railway.' }
  }
  const mode: ProviderMode = token.startsWith('TEST-') ? 'test' : 'live'
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      const hint =
        res.status === 403
          ? ' El token no tiene permiso para operar (revisa el estado de la cuenta y los scopes de la aplicación en Mercado Pago).'
          : res.status === 401
            ? ' El token es inválido o fue regenerado — genera uno nuevo en Mercado Pago.'
            : ''
      return { provider: 'mercadopago', configured: true, mode, ok: false, message: `Mercado Pago devolvió HTTP ${res.status}.${hint}` }
    }
    const data = await res.json()
    return {
      provider: 'mercadopago',
      configured: true,
      mode,
      ok: true,
      message: 'Conexión con Mercado Pago correcta.',
      account: `${data.nickname} · ${data.email} · ${data.site_id}`,
    }
  } catch (e) {
    return { provider: 'mercadopago', configured: true, mode, ok: false, message: `Mercado Pago no respondió: ${(e as Error).message}` }
  }
}

export type SecretCheck = { name: string; present: boolean; mode: ProviderMode; hint: string }

export function secretKeyChecklist(): SecretCheck[] {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  return [
    {
      name: 'STRIPE_SECRET_KEY',
      present: !!stripeSecret,
      mode: stripeSecret ? stripeMode(stripeSecret) : null,
      hint: 'Clave secreta o restringida (rk_) de Stripe. Recomendado: rk_ con permisos mínimos.',
    },
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      present: !!process.env.STRIPE_WEBHOOK_SECRET,
      mode: null,
      hint: 'Firma del endpoint de webhooks de Stripe (whsec_). Necesaria para confirmar pagos.',
    },
    {
      name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      present: !!publishable,
      mode: publishable ? stripeMode(publishable) : null,
      hint: 'Clave pública (pk_). Segura de exponer; se usa en el navegador.',
    },
    {
      name: 'MERCADOPAGO_ACCESS_TOKEN',
      present: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      mode: process.env.MERCADOPAGO_ACCESS_TOKEN
        ? process.env.MERCADOPAGO_ACCESS_TOKEN.startsWith('TEST-')
          ? 'test'
          : 'live'
        : null,
      hint: 'Access token de producción de Mercado Pago (APP_USR-…).',
    },
  ]
}
