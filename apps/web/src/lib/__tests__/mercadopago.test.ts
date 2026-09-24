vi.mock('@/lib/integration-secrets', () => ({
  getIntegrationValue: async (key: string) => process.env[key],
  getIntegrationValues: async (keys: readonly string[]) => Object.fromEntries(keys.map(key => [key, process.env[key]])),
}))
// @vitest-environment node
import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('mercadopago', () => ({
  MercadoPagoConfig: class {}, Payment: class {},
  Preference: class { create = mocks.create },
}))
import { createMercadoPagoPreference, verifyMercadoPagoSignature } from '../mercadopago'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-test-fixture')
  vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'test-secret')
  vi.stubEnv('MERCADOPAGO_TEST_MODE', 'false')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://shop.example')
  mocks.create.mockResolvedValue({ id: 'pref-1', init_point: 'https://mp.example/live', sandbox_init_point: 'https://mp.example/test' })
})
afterEach(() => vi.unstubAllEnvs())

describe('MP signature', () => {
  const sign = (manifest: string) => createHmac('sha256', 'test-secret').update(manifest).digest('hex')
  const input = { dataId: '1234', requestId: 'request-1', secret: 'test-secret', signature: `ts=1700000000,v1=${sign('id:1234;request-id:request-1;ts:1700000000;')}` }
  it('accepts the documented signed manifest', () => expect(verifyMercadoPagoSignature(input)).toBe(true))
  it('rejects tampering of the query ID, request ID or secret', () => {
    expect(verifyMercadoPagoSignature({ ...input, dataId: '1235' })).toBe(false)
    expect(verifyMercadoPagoSignature({ ...input, requestId: 'other' })).toBe(false)
    expect(verifyMercadoPagoSignature({ ...input, secret: 'other' })).toBe(false)
  })
  it.each([null, '', 'v1=bad', 'ts=1700000000,v1=123', 'ts=abc,v1=' + 'a'.repeat(64)])('rejects malformed signature %s without throwing', signature => {
    expect(verifyMercadoPagoSignature({ ...input, signature })).toBe(false)
  })
})

describe('MP preference', () => {
  const input = { paymentId: 'payment1', orderId: 'order1', orderCode: 'CBC-1', type: 'full' as const,
    items: [{ id: 'box', title: 'Box', quantity: 1, unit_price: 999.99 }],
    payer: { name: 'Comprador', email: 'buyer@example.com' }, returnPath: '/productos/box', oxxoEnabled: false, msiEnabled: false }
  it('uses MXN, a payment reference, HTTPS callbacks and configured payment methods', async () => {
    expect(await createMercadoPagoPreference(input)).toEqual({ id: 'pref-1', url: 'https://mp.example/live' })
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({
      external_reference: 'payment1', items: [expect.objectContaining({ currency_id: 'MXN', unit_price: 999.99 })],
      notification_url: 'https://shop.example/api/webhooks/mercadopago',
      payment_methods: { excluded_payment_methods: [{ id: 'oxxo' }], installments: 1 },
    }) }))
  })
  it('uses init_point for test sellers too and honors enabled installments', async () => {
    vi.stubEnv('MERCADOPAGO_TEST_MODE', 'true')
    expect((await createMercadoPagoPreference({ ...input, oxxoEnabled: true, msiEnabled: true })).url).toBe('https://mp.example/live')
    expect(mocks.create.mock.calls[0][0].body.payment_methods).toEqual({ excluded_payment_methods: [], installments: 12 })
  })
  it('refuses to create payments without webhook verification configured', async () => {
    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', '')
    await expect(createMercadoPagoPreference(input)).rejects.toThrow('MERCADOPAGO_WEBHOOK_SECRET')
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('rejects non-HTTPS callbacks before contacting MP', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    await expect(createMercadoPagoPreference(input)).rejects.toThrow('HTTPS')
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
