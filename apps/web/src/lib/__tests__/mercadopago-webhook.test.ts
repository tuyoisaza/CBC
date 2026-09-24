// @vitest-environment node
import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ get: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), settle: vi.fn() }))
vi.mock('mercadopago', () => ({ MercadoPagoConfig: class {}, Preference: class {}, Payment: class { get = mocks.get } }))
vi.mock('@/lib/integration-secrets', () => ({
  getIntegrationValue: async (key: string) => process.env[key],
  getIntegrationValues: async (keys: readonly string[]) => Object.fromEntries(keys.map(key => [key, process.env[key]])),
}))
vi.mock('@/lib/db', () => ({ db: { payment: { findUnique: mocks.findUnique, findFirst: mocks.findFirst, updateMany: mocks.updateMany } } }))
vi.mock('@/lib/payment-settlement', async importOriginal => ({ ...await importOriginal<typeof import('../payment-settlement')>(), settlePayment: mocks.settle }))
vi.mock('@/lib/order-payments', () => ({ ensureBalancePayment: vi.fn() }))
vi.mock('@/lib/notifications', () => ({}))
import { POST } from '@/app/api/webhooks/mercadopago/route'

const payment = { id: 'local1', orderId: 'order1', provider: 'mercadopago', amount: 1000.25, currency: 'MXN', status: 'pending', type: 'full' }
const remote = { id: 1234, live_mode: true, external_reference: 'local1', status: 'approved', transaction_amount: 1000.25, currency_id: 'MXN' }
function request(body: unknown = { type: 'payment', data: { id: '1234' } }, signed = true) {
  const signature = createHmac('sha256', 'secret').update('id:1234;request-id:request1;ts:1700000000;').digest('hex')
  return new NextRequest('https://shop.example/api/webhooks/mercadopago?data.id=1234', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': 'request1', 'x-signature': signed ? `ts=1700000000,v1=${signature}` : 'bad' },
    body: JSON.stringify(body),
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-fixture')
  vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'secret')
  vi.stubEnv('MERCADOPAGO_TEST_MODE', 'false')
  mocks.get.mockResolvedValue(remote)
  mocks.findUnique.mockResolvedValue(payment)
  mocks.settle.mockResolvedValue({ alreadyProcessed: false })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('MP webhook', () => {
  it('verifies and settles an approved payment', async () => {
    expect((await POST(request())).status).toBe(200)
    expect(mocks.settle).toHaveBeenCalledWith('local1', { provider: 'mercadopago', externalId: '1234', amount: 1000.25, currency: 'MXN' })
  })
  it('rejects invalid signatures before API access', async () => {
    expect((await POST(request(undefined, false))).status).toBe(401)
    expect(mocks.get).not.toHaveBeenCalled()
  })
  it('rejects mismatched body IDs even with a valid signature', async () => {
    expect((await POST(request({ type: 'payment', data: { id: '4321' } }))).status).toBe(400)
    expect(mocks.get).not.toHaveBeenCalled()
  })
  it.each([{ transaction_amount: 1 }, { currency_id: 'USD' }, { live_mode: false }])('rejects wrong amount/currency/environment %j', async patch => {
    mocks.get.mockResolvedValue({ ...remote, ...patch })
    expect((await POST(request())).status).toBe(400)
    expect(mocks.settle).not.toHaveBeenCalled()
  })
  it('never credits a Stripe record using MP', async () => {
    mocks.findUnique.mockResolvedValue({ ...payment, provider: 'stripe' })
    expect((await POST(request())).status).toBe(400)
    expect(mocks.settle).not.toHaveBeenCalled()
  })
  it.each(['pending', 'in_process', 'authorized'])('leaves %s payments unfulfilled', async status => {
    mocks.get.mockResolvedValue({ ...remote, status })
    expect((await POST(request())).status).toBe(200)
    expect(mocks.settle).not.toHaveBeenCalled()
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
  it('allows rejected attempts to be retried without cancelling the order', async () => {
    mocks.get.mockResolvedValue({ ...remote, status: 'rejected' })
    expect((await POST(request())).status).toBe(200)
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: 'local1', status: 'pending' }, data: { status: 'failed' } })
  })
  it('returns retryable failure when API or fulfillment fails', async () => {
    mocks.get.mockRejectedValueOnce(new Error('timeout'))
    expect((await POST(request())).status).toBe(503)
    mocks.settle.mockRejectedValueOnce(new Error('database down'))
    expect((await POST(request())).status).toBe(503)
  })
  it('preserves old retail preferences using order references', async () => {
    mocks.findUnique.mockResolvedValue(null)
    mocks.get.mockResolvedValue({ ...remote, external_reference: 'order1' })
    mocks.findFirst.mockResolvedValue(payment)
    expect((await POST(request())).status).toBe(200)
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { orderId: 'order1', provider: 'mercadopago', type: 'full' } })
    expect(mocks.settle).toHaveBeenCalled()
  })
  it('requires configuration even for requests with a signature', async () => {
    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', '')
    expect((await POST(request())).status).toBe(503)
    expect(mocks.get).not.toHaveBeenCalled()
  })
})
