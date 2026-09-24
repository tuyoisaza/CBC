import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))
vi.mock('@/lib/integration-secrets', () => ({
  getIntegrationValue: async (key: string) => process.env[key],
  getIntegrationValues: async (keys: readonly string[]) => Object.fromEntries(keys.map(key => [key, process.env[key]])),
}))
vi.mock('@/lib/db', () => ({ db: { setting: { findMany } } }))
import { getPaymentConfig, checkMercadoPagoStatus, secretKeyChecklist } from '../payment-config'

beforeEach(() => {
  findMany.mockResolvedValue([])
  vi.stubEnv('STRIPE_SECRET_KEY', '')
  vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', '')
  vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', '')
  vi.stubEnv('MERCADOPAGO_TEST_MODE', 'false')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('payment configuration', () => {
  it('defaults B2B to Mercado Pago only when token and signature are configured', async () => {
    expect((await getPaymentConfig()).b2bProvider).toBe('stripe')
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-test-seller')
    expect((await getPaymentConfig()).b2bProvider).toBe('stripe')
    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'fixture-secret')
    expect((await getPaymentConfig()).b2bProvider).toBe('mercadopago')
  })

  it('preserves an explicit B2B provider and independent checkout flags', async () => {
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-test-seller')
    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'fixture-secret')
    findMany.mockResolvedValue([
      { key: 'payments_b2b_provider', value: 'stripe' },
      { key: 'payments_single_providers', value: '["mercadopago"]' },
      { key: 'payments_oxxo_enabled', value: 'false' },
      { key: 'payments_msi_enabled', value: 'true' },
    ])
    expect(await getPaymentConfig()).toEqual({
      b2bProvider: 'stripe', singleProviders: ['mercadopago'], oxxoEnabled: false, msiEnabled: true,
    })
  })

  it('does not offer an unconfigured provider, even if saved as enabled', async () => {
    findMany.mockResolvedValue([{ key: 'payments_single_providers', value: '["mercadopago","stripe"]' }])
    expect((await getPaymentConfig()).singleProviders).toEqual([])
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-test-seller')
    expect((await getPaymentConfig()).singleProviders).toEqual([])
    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'fixture-secret')
    expect((await getPaymentConfig()).singleProviders).toEqual(['mercadopago'])
  })

  it('respects an explicitly empty provider list', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fixture')
    findMany.mockResolvedValue([{ key: 'payments_single_providers', value: '[]' }])
    expect((await getPaymentConfig()).singleProviders).toEqual([])
  })

  it('does not report ready or call the provider when the signing secret is missing', async () => {
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-example')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const status = await checkMercadoPagoStatus()
    expect(status.ok).toBe(false)
    expect(status.message).toContain('MERCADOPAGO_WEBHOOK_SECRET')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['APP_USR-test-seller', 'true', 'test'],
    ['TEST-example', 'false', 'test'],
    ['APP_USR-live-seller', 'false', 'live'],
  ])('detects mode for %s with explicit test mode %s', async (token, testMode, mode) => {
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', token)
    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'example-signing-secret')
    vi.stubEnv('MERCADOPAGO_TEST_MODE', testMode)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ nickname: 'Seller', email: 'seller@example.test', site_id: 'MLM' }),
    }))
    expect(await checkMercadoPagoStatus()).toMatchObject({ ok: true, mode })
    expect((await secretKeyChecklist()).find(item => item.name === 'MERCADOPAGO_ACCESS_TOKEN')?.mode).toBe(mode)
  })
})
