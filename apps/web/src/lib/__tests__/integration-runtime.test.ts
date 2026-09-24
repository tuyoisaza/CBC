// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  values: {} as Record<string, string | undefined>,
  stripe: vi.fn(), mercado: vi.fn(),
}))
vi.mock('@/lib/integration-secrets', () => ({
  getIntegrationValue: async (key: string) => mocks.values[key],
  getIntegrationValues: async (keys: readonly string[]) => Object.fromEntries(keys.map(key => [key, mocks.values[key]])),
}))
vi.mock('stripe', () => ({ default: class { constructor(key: string) { mocks.stripe(key) } } }))
vi.mock('mercadopago', () => ({
  MercadoPagoConfig: class { constructor(options: unknown) { mocks.mercado(options) } },
  Preference: class {}, Payment: class {},
}))
import { getStripe, isStripeConfigured } from '../stripe'
import { getMercadoPagoClient, isMercadoPagoTestMode, assertMercadoPagoConfigured } from '../mercadopago'
import { generateText } from '../llm'

beforeEach(() => { mocks.values = {}; vi.clearAllMocks() })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('runtime integration credentials', () => {
  it('creates new Stripe clients from the current vault value and respects disabled keys', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'environment-must-not-bypass-vault')
    mocks.values.STRIPE_SECRET_KEY = 'sk_test_first'
    await getStripe()
    mocks.values.STRIPE_SECRET_KEY = 'sk_test_second'
    await getStripe()
    delete mocks.values.STRIPE_SECRET_KEY
    expect(await isStripeConfigured()).toBe(false)
    await expect(getStripe()).rejects.toThrow('no está configurado')
    expect(mocks.stripe.mock.calls).toEqual([['sk_test_first'], ['sk_test_second']])
  })

  it('refreshes Mercado Pago clients and mode without restarting', async () => {
    mocks.values.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-first'
    expect(await isMercadoPagoTestMode()).toBe(false)
    await getMercadoPagoClient()
    mocks.values.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-second'
    mocks.values.MERCADOPAGO_TEST_MODE = 'true'
    expect(await isMercadoPagoTestMode()).toBe(true)
    await getMercadoPagoClient()
    expect(mocks.mercado.mock.calls.map(call => call[0].accessToken)).toEqual(['APP_USR-first', 'APP_USR-second'])
    await expect(assertMercadoPagoConfigured()).rejects.toThrow('MERCADOPAGO_WEBHOOK_SECRET')
    delete mocks.values.MERCADOPAGO_ACCESS_TOKEN
    await expect(getMercadoPagoClient()).rejects.toThrow('no está configurado')
  })

  it('uses current text-generation credentials and never propagates provider error bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'Hello' } }] }) })
    vi.stubGlobal('fetch', fetchMock)
    const input = { system: 'help', prompt: 'hello', maxTokens: 10 }
    mocks.values.OPENAI_API_KEY = 'first'
    expect(await generateText(input)).toBe('Hello')
    mocks.values.OPENAI_API_KEY = 'second'
    await generateText(input)
    expect(fetchMock.mock.calls.map(call => call[1].headers.Authorization)).toEqual(['Bearer first', 'Bearer second'])
    fetchMock.mockRejectedValueOnce({ config: { headers: { authorization: 'do-not-disclose' } } })
    await expect(generateText(input)).rejects.toThrow('Text generation unavailable')
    delete mocks.values.OPENAI_API_KEY
    await expect(generateText(input)).rejects.toThrow('Text generation unavailable')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
