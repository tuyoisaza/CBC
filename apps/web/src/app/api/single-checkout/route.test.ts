import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  findPayment: vi.fn(), updatePayment: vi.fn(), createPayment: vi.fn(), transaction: vi.fn(),
  product: vi.fn(), customer: vi.fn(), lead: vi.fn(), quote: vi.fn(), order: vi.fn(),
  preference: vi.fn(), stripe: vi.fn(), config: vi.fn(), shipping: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  db: { payment: { findUnique: mocks.findPayment, update: mocks.updatePayment }, product: { findUnique: mocks.product }, $transaction: mocks.transaction },
  withDbRetry: (fn: () => unknown) => fn(), ensureDbAwake: async () => ({ wokeUp: false }),
}))
vi.mock('@/lib/db-helpers', () => ({ getOrCreateCustomer: mocks.customer }))
vi.mock('@/lib/mercadopago', () => ({ assertMercadoPagoConfigured: vi.fn(), createMercadoPagoPreference: mocks.preference }))
vi.mock('@/lib/stripe', () => ({ isStripeConfigured: () => true, createSingleCheckoutSession: mocks.stripe }))
vi.mock('@/lib/payment-config', () => ({ getPaymentConfig: mocks.config }))
vi.mock('@/lib/shipping', () => ({ getRetailShippingQuote: mocks.shipping }))
vi.mock('@/lib/pricing', () => ({ getSingleMarkupPct: async () => 0, priceWithTax: (n: number) => n, priceBeforeTax: (n: number) => n / 1.16, taxAmount: (n: number) => n - n / 1.16 }))
import { POST } from './route'

const purchase = {
  idempotencyKey: '94376d8e-5190-4b57-a34f-40f9c9c95258', slug: 'coffee', name: 'Ana', email: 'ana@example.com',
  whatsapp: '5512345678', provider: 'mercadopago',
  address: { street: 'Calle Uno', extNo: '1', colonia: 'Centro', cp: '06700', city: 'CDMX', state: 'CDMX' },
}
const submit = async (body = purchase) => (await POST(new NextRequest('https://cbc.example/api/single-checkout', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
}))).json()
let saved: Map<string, any>
beforeEach(() => {
  vi.resetAllMocks()
  saved = new Map()
  mocks.findPayment.mockImplementation(({ where }) => Promise.resolve(saved.get(where.id) || null))
  mocks.product.mockResolvedValue({ slug: 'coffee', name: 'Café', price: 300, active: true })
  mocks.customer.mockResolvedValue({ id: 'customer1' })
  mocks.config.mockResolvedValue({ singleProviders: ['mercadopago', 'stripe'], oxxoEnabled: true, msiEnabled: false })
  mocks.shipping.mockResolvedValue({ cost: 150, method: 'flat' })
  mocks.lead.mockResolvedValue({ id: 'lead1' })
  mocks.quote.mockImplementation(({ data }) => Promise.resolve({ id: 'quote1', ...data }))
  mocks.order.mockImplementation(({ data }) => Promise.resolve({ id: 'order1', ...data }))
  mocks.createPayment.mockImplementation(({ data }) => Promise.resolve({ paymentLinkUrl: null, ...data }))
  mocks.transaction.mockImplementation(async fn => {
    const result = await fn({ lead: { create: mocks.lead }, quote: { create: mocks.quote }, order: { create: mocks.order }, payment: { create: mocks.createPayment } })
    saved.set(result.id, result)
    return result
  })
  mocks.updatePayment.mockImplementation(({ where, data }) => {
    const result = { ...saved.get(where.id), ...data }; saved.set(where.id, result); return Promise.resolve(result)
  })
  mocks.preference.mockResolvedValue({ id: 'mp1', url: 'https://mp.example/pay' })
  mocks.stripe.mockResolvedValue({ id: 'stripe1', url: 'https://stripe.example/pay' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('retail checkout retries', () => {
  it('reuses the saved URL, order and payment for an identical purchase', async () => {
    const first = await submit()
    expect(first.ok).toBe(true)
    expect(await submit()).toEqual(first)
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.preference).toHaveBeenCalledTimes(1)
    expect(mocks.createPayment.mock.invocationCallOrder[0]).toBeLessThan(mocks.preference.mock.invocationCallOrder[0])
  })

  it('recovers a provider failure with original price, shipping and payment identity', async () => {
    mocks.preference.mockRejectedValueOnce(new Error('timeout'))
    expect((await submit()).ok).toBe(false)
    mocks.product.mockResolvedValue({ slug: 'coffee', name: 'Changed', price: 999, active: true })
    mocks.shipping.mockResolvedValue({ cost: 500, method: 'flat' })
    expect((await submit()).ok).toBe(true)
    expect(mocks.preference.mock.calls[1][0]).toEqual(mocks.preference.mock.calls[0][0])
    expect(mocks.preference.mock.calls[1][0].items.map((i: any) => i.unit_price)).toEqual([300, 150])
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.customer).toHaveBeenCalledTimes(1)
    expect(mocks.product).toHaveBeenCalledTimes(1)
  })

  it('recovers after provider success but failed URL persistence with the same provider request', async () => {
    mocks.updatePayment.mockRejectedValueOnce(new Error('database unavailable'))
    expect((await submit()).ok).toBe(false)
    expect((await submit()).ok).toBe(true)
    expect(mocks.preference.mock.calls[1][0]).toEqual(mocks.preference.mock.calls[0][0])
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
  })

  it('isolates changed shipping addresses even if a caller reuses its UUID', async () => {
    await submit()
    await submit({ ...purchase, address: { ...purchase.address, extNo: '2' } })
    expect(mocks.transaction).toHaveBeenCalledTimes(2)
    expect(mocks.preference.mock.calls[0][0].paymentId).not.toBe(mocks.preference.mock.calls[1][0].paymentId)
  })

  it('normalizes whitespace and formatted phone numbers before deriving identity', async () => {
    const first = await submit()
    expect(await submit({ ...purchase, name: ' Ana ', whatsapp: '55 1234 5678' })).toEqual(first)
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
  })

  it('recovers the winning committed order on a concurrent unique constraint conflict', async () => {
    const first = await submit()
    mocks.findPayment.mockResolvedValueOnce(null)
    mocks.transaction.mockRejectedValueOnce({ code: 'P2002' })
    expect(await submit()).toEqual(first)
    expect(mocks.preference).toHaveBeenCalledTimes(1)
  })

  it('does not reopen already paid checkouts', async () => {
    await submit()
    const checkout = [...saved.values()][0]
    saved.set(checkout.id, { ...checkout, status: 'paid' })
    expect(await submit()).toEqual(expect.objectContaining({ ok: true, url: `/tracking/${checkout.order.orderCode}` }))
    expect(mocks.preference).toHaveBeenCalledTimes(1)
  })

  it('reuses a failed attempt link without creating another order or preference', async () => {
    const first = await submit()
    const checkout = [...saved.values()][0]
    saved.set(checkout.id, { ...checkout, status: 'failed' })
    expect(await submit()).toEqual(first)
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.preference).toHaveBeenCalledTimes(1)
  })

  it.each(['refunded', 'charged_back'])('blocks %s payments', async status => {
    await submit()
    const checkout = [...saved.values()][0]
    saved.set(checkout.id, { ...checkout, status })
    expect((await submit()).code).toBe('PAYMENT_ALREADY_PROCESSED')
    expect(mocks.preference).toHaveBeenCalledTimes(1)
  })

  it('does not expose SDK credentials in responses or logs', async () => {
    mocks.preference.mockRejectedValueOnce({ message: 'Authorization: secret-token', headers: { Authorization: 'secret-token' } })
    const result = await submit()
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toContain('secret-token')
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret-token')
  })

  it('also retries Stripe with stable metadata and line items', async () => {
    const body = { ...purchase, provider: 'stripe' }
    mocks.stripe.mockRejectedValueOnce(new Error('timeout'))
    expect((await submit(body)).ok).toBe(false)
    expect((await submit(body)).ok).toBe(true)
    expect(mocks.stripe.mock.calls[1][0]).toEqual(mocks.stripe.mock.calls[0][0])
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
  })
})
