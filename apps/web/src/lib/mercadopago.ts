import { createHmac, timingSafeEqual } from 'node:crypto'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { getIntegrationValue, getIntegrationValues } from './integration-secrets'

export async function getMercadoPagoClient() {
  const accessToken = await getIntegrationValue('MERCADOPAGO_ACCESS_TOKEN')
  if (!accessToken) throw new Error('Mercado Pago no está configurado.')
  return new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } })
}

export async function isMercadoPagoTestMode() {
  const config = await getIntegrationValues(['MERCADOPAGO_TEST_MODE', 'MERCADOPAGO_ACCESS_TOKEN'])
  return config.MERCADOPAGO_TEST_MODE === 'true' || !!config.MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-')
}

export async function assertMercadoPagoConfigured() {
  const config = await getIntegrationValues(['MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET'])
  if (!config.MERCADOPAGO_ACCESS_TOKEN || !config.MERCADOPAGO_WEBHOOK_SECRET) {
    throw new Error('Configura MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_WEBHOOK_SECRET antes de cobrar.')
  }
  getPaymentOrigin()
}

export function getPaymentOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL || '')
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('NEXT_PUBLIC_APP_URL debe ser una URL pública HTTPS para recibir pagos.')
  }
  return url.origin
}

/** Checkout Pro via Preferences API; the reference identifies one local payment. */
export async function createMercadoPagoPreference(opts: {
  paymentId: string
  orderId: string
  orderCode: string
  type: 'full' | 'deposit' | 'balance'
  items: { id: string; title: string; quantity: number; unit_price: number }[]
  payer: { name: string; email?: string }
  returnPath: string
  oxxoEnabled: boolean
  msiEnabled: boolean
}) {
  await assertMercadoPagoConfigured()
  const origin = getPaymentOrigin()
  const backUrl = (status: string) => {
    const url = new URL(opts.returnPath, origin)
    if (url.origin !== origin) throw new Error('Invalid payment return URL')
    url.searchParams.set('compra', status)
    url.searchParams.set('order', opts.orderCode)
    return url.toString()
  }
  const preference = await new Preference(await getMercadoPagoClient()).create({
    body: {
      items: opts.items.map(item => ({ ...item, currency_id: 'MXN' })),
      payer: opts.payer,
      back_urls: { success: backUrl('exito'), pending: backUrl('pendiente'), failure: backUrl('fallo') },
      auto_return: 'approved',
      notification_url: `${origin}/api/webhooks/mercadopago`,
      external_reference: opts.paymentId,
      metadata: { payment_id: opts.paymentId, order_id: opts.orderId, type: opts.type },
      payment_methods: {
        excluded_payment_methods: opts.oxxoEnabled ? [] : [{ id: 'oxxo' }],
        installments: opts.msiEnabled ? 12 : 1,
      },
    },
    requestOptions: { idempotencyKey: `cbc-payment-${opts.paymentId}` },
  })
  // Checkout Pro test sellers also use init_point. sandbox_init_point is not
  // the supported redirect for the test-account flow.
  const url = preference.init_point
  if (!preference.id || !url) throw new Error('Mercado Pago no devolvió un enlace de pago válido.')
  return { id: preference.id, url }
}

export async function getMercadoPagoPayment(id: string) {
  return new Payment(await getMercadoPagoClient()).get({ id })
}

/** Validate the signed query ID, never an unsigned ID supplied only in the body. */
export function verifyMercadoPagoSignature(input: {
  dataId: string | null
  requestId: string | null
  signature: string | null
  secret: string
}): boolean {
  if (!input.dataId || !input.requestId || !input.signature || !input.secret) return false
  const parts = input.signature.split(',').map(part => part.trim().split('='))
  const ts = parts.find(([key]) => key === 'ts')?.[1]
  const v1 = parts.find(([key]) => key === 'v1')?.[1]
  if (!ts || !/^\d+$/.test(ts) || !v1 || !/^[a-fA-F0-9]{64}$/.test(v1)) return false
  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${ts};`
  const expected = createHmac('sha256', input.secret).update(manifest).digest()
  return timingSafeEqual(expected, Buffer.from(v1, 'hex'))
}
