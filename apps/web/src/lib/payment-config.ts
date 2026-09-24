import { getIntegrationValues } from './integration-secrets'
import { db } from '@/lib/db'
import {
  PAYMENTS_SINGLE_PROVIDERS_KEY, PAYMENTS_B2B_PROVIDER_KEY,
  PAYMENTS_OXXO_KEY, PAYMENTS_MSI_KEY,
  type PaymentProvider, type PaymentConfig,
} from './payment-settings'
export * from './payment-settings'

/** Payment behavior settings and effective encrypted-vault/environment credentials. */

const DEFAULT_OXXO = true
const DEFAULT_MSI = false

/**
 * Providers to offer when the admin hasn't set an explicit list: every one
 * whose credentials exist in the environment. So adding STRIPE_SECRET_KEY is
 * enough for "Tarjeta" to show up as a choice — no admin toggle needed.
 * Order here is the order the buyer sees them in.
 */
function configuredProviders(config: Record<string, string | undefined>): PaymentProvider[] {
  // Order = what the buyer sees, and options[0] is pre-selected. Card (Stripe)
  // first; it matches the admin form's order and is the working path while the
  // Mercado Pago account clears its policy review.
  const list: PaymentProvider[] = []
  if (config.STRIPE_SECRET_KEY) list.push('stripe')
  if (config.MERCADOPAGO_ACCESS_TOKEN && config.MERCADOPAGO_WEBHOOK_SECRET) list.push('mercadopago')
  return list
}

function parseProviders(raw: string | undefined, config: Record<string, string | undefined>): PaymentProvider[] {
  if (!raw) return configuredProviders(config)
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return configuredProviders(config)
    const configured = configuredProviders(config)
    return [...new Set(arr.filter((p): p is PaymentProvider => configured.includes(p)))]
  } catch {
    return configuredProviders(config)
  }
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const config = await getIntegrationValues(['STRIPE_SECRET_KEY', 'MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET'])
  const rows = await db.setting.findMany({
    where: { key: { in: [PAYMENTS_SINGLE_PROVIDERS_KEY, PAYMENTS_B2B_PROVIDER_KEY, PAYMENTS_OXXO_KEY, PAYMENTS_MSI_KEY] } },
  })
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return {
    singleProviders: parseProviders(map[PAYMENTS_SINGLE_PROVIDERS_KEY], config),
    b2bProvider: map[PAYMENTS_B2B_PROVIDER_KEY] === 'stripe' || map[PAYMENTS_B2B_PROVIDER_KEY] === 'mercadopago'
      ? map[PAYMENTS_B2B_PROVIDER_KEY] as PaymentProvider
      : config.MERCADOPAGO_ACCESS_TOKEN && config.MERCADOPAGO_WEBHOOK_SECRET ? 'mercadopago' : 'stripe',
    oxxoEnabled: map[PAYMENTS_OXXO_KEY] ? map[PAYMENTS_OXXO_KEY] === 'true' : DEFAULT_OXXO,
    msiEnabled: map[PAYMENTS_MSI_KEY] ? map[PAYMENTS_MSI_KEY] === 'true' : DEFAULT_MSI,
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
  const config = await getIntegrationValues(['STRIPE_SECRET_KEY'])
  const key = config.STRIPE_SECRET_KEY
  if (!key) {
    return { provider: 'stripe', configured: false, mode: null, ok: false, message: 'STRIPE_SECRET_KEY no está configurada.' }
  }
  const mode = stripeMode(key)
  try {
    const { getStripe } = await import('@/lib/stripe')
    const stripe = await getStripe()
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
      message: 'Stripe no respondió correctamente.',
    }
  }
}

export async function checkMercadoPagoStatus(): Promise<ProviderStatus> {
  const config = await getIntegrationValues(['MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET', 'MERCADOPAGO_TEST_MODE'])
  const token = config.MERCADOPAGO_ACCESS_TOKEN
  if (!token) {
    return { provider: 'mercadopago', configured: false, mode: null, ok: false, message: 'MERCADOPAGO_ACCESS_TOKEN no está configurada.' }
  }
  const mode: ProviderMode = config.MERCADOPAGO_TEST_MODE === 'true' || token.startsWith('TEST-') ? 'test' : 'live'
  if (!config.MERCADOPAGO_WEBHOOK_SECRET) {
    return { provider: 'mercadopago', configured: false, mode, ok: false, message: 'Falta MERCADOPAGO_WEBHOOK_SECRET para confirmar pagos de forma segura.' }
  }
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
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
      message: 'Conexión y firma configuradas. Verifica una compra de prueba y su notificación antes de activar cobros.',
      account: `${data.nickname} · ${data.email} · ${data.site_id}`,
    }
  } catch (e) {
    return { provider: 'mercadopago', configured: true, mode, ok: false, message: 'Mercado Pago no respondió correctamente.' }
  }
}

export type SecretCheck = { name: string; present: boolean; mode: ProviderMode; hint: string }

export async function secretKeyChecklist(): Promise<SecretCheck[]> {
  const config = await getIntegrationValues(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET', 'MERCADOPAGO_TEST_MODE'])
  const stripeSecret = config.STRIPE_SECRET_KEY
  const publishable = config.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  return [
    {
      name: 'STRIPE_SECRET_KEY',
      present: !!stripeSecret,
      mode: stripeSecret ? stripeMode(stripeSecret) : null,
      hint: 'Clave secreta o restringida (rk_) de Stripe. Recomendado: rk_ con permisos mínimos.',
    },
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      present: !!config.STRIPE_WEBHOOK_SECRET,
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
      present: !!config.MERCADOPAGO_ACCESS_TOKEN,
      mode: config.MERCADOPAGO_ACCESS_TOKEN
        ? config.MERCADOPAGO_TEST_MODE === 'true' || config.MERCADOPAGO_ACCESS_TOKEN.startsWith('TEST-')
          ? 'test'
          : 'live'
        : null,
      hint: 'Access token de producción de Mercado Pago (APP_USR-…).',
    },
    {
      name: 'MERCADOPAGO_WEBHOOK_SECRET',
      present: !!config.MERCADOPAGO_WEBHOOK_SECRET,
      mode: null,
      hint: 'Firma secreta de Webhooks en Tus integraciones de Mercado Pago. No es el access token.',
    },
  ]
}
