import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findOrder: vi.fn(), findPayment: vi.fn(), upsertPayment: vi.fn(), updatePayment: vi.fn(),
  preference: vi.fn(), stripe: vi.fn(), config: vi.fn(), findCustomer: vi.fn(), notify: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ db: { order: { findUnique: mocks.findOrder }, customer: { findUnique: mocks.findCustomer }, payment: { findFirst: mocks.findPayment, upsert: mocks.upsertPayment, update: mocks.updatePayment } } }))
vi.mock('@/lib/notifications', () => ({ sendPaymentLinkToCustomer: mocks.notify }))
vi.mock('@/lib/mercadopago', () => ({ createMercadoPagoPreference: mocks.preference }))
vi.mock('@/lib/stripe', () => ({ getStripe: async () => ({ checkout: { sessions: { create: mocks.stripe } } }) }))
vi.mock('@/lib/payment-config', () => ({ getPaymentConfig: mocks.config }))

import { depositAmount, ensureBalancePayment, ensureOrderPayment } from '../order-payments'

const order = { id: 'order1', orderCode: 'CBC-1', customerId: 'customer1', customer: { contactName: 'Ana', companyName: 'ACME', email: 'ana@example.com' } }
const payment = { id: 'cbc-deposit-order1', orderId: 'order1', type: 'deposit', provider: 'mercadopago', amount: 300, currency: 'MXN', status: 'pending', paymentLinkUrl: null }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.findOrder.mockResolvedValue(order)
  mocks.findPayment.mockResolvedValue(null)
  mocks.upsertPayment.mockResolvedValue(payment)
  mocks.config.mockResolvedValue({ oxxoEnabled: true, msiEnabled: false })
  mocks.preference.mockResolvedValue({ id: 'preference1', url: 'https://mp.example/pay' })
  mocks.updatePayment.mockImplementation(({ data }) => Promise.resolve({ ...payment, ...data }))
})

describe('B2B payments', () => {
  it('uses configured advance percentages with cent rounding', () => {
    expect(depositAmount(999.99, 30)).toBe(300)
    expect(depositAmount(100, 100)).toBe(100)
    for (const pct of [0, -1, 101, NaN]) expect(() => depositAmount(100, pct)).toThrow()
  })

  it('persists the pending payment before creating the MP checkout', async () => {
    await ensureOrderPayment('order1', 'mercadopago', 'deposit', 300)
    expect(mocks.upsertPayment.mock.invocationCallOrder[0]).toBeLessThan(mocks.preference.mock.invocationCallOrder[0])
    expect(mocks.preference).toHaveBeenCalledWith(expect.objectContaining({ paymentId: payment.id, type: 'deposit', items: [{ id: payment.id, title: 'CBC CBC-1 — Anticipo', quantity: 1, unit_price: 300 }] }))
  })

  it('reuses a pending link without creating another checkout even if the requested provider changes', async () => {
    mocks.findPayment.mockResolvedValue({ ...payment, paymentLinkUrl: 'https://existing.example' })
    const result = await ensureOrderPayment('order1', 'stripe', 'deposit', 300)
    expect(result.provider).toBe('mercadopago')
    expect(mocks.preference).not.toHaveBeenCalled()
    expect(mocks.stripe).not.toHaveBeenCalled()
  })

  it('repairs a missing provider link using the persisted payment identity', async () => {
    mocks.findPayment.mockResolvedValue(payment)
    await ensureOrderPayment('order1', 'stripe', 'deposit', 999)
    expect(mocks.preference).toHaveBeenCalledWith(expect.objectContaining({ paymentId: payment.id, items: [expect.objectContaining({ unit_price: 300 })] }))
    expect(mocks.upsertPayment).not.toHaveBeenCalled()
  })

  it('creates the balance from the unpaid total, not a hardcoded 50 percent', async () => {
    mocks.findOrder.mockResolvedValueOnce({ ...order, quote: { total: 1000 }, payments: [{ type: 'deposit', status: 'paid', amount: 300 }] })
    await ensureBalancePayment('order1', 'mercadopago')
    expect(mocks.upsertPayment).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ id: 'cbc-balance-order1', amount: 700, type: 'balance', provider: 'mercadopago' }) }))
  })

  it('does not issue a balance for an unpaid or fully paid order', async () => {
    mocks.findOrder.mockResolvedValue({ ...order, quote: { total: 1000 }, payments: [{ type: 'deposit', status: 'paid', amount: 1000 }] })
    expect(await ensureBalancePayment('order1', 'mercadopago')).toBeNull()
    mocks.findOrder.mockResolvedValue({ ...order, quote: { total: 1000 }, payments: [{ type: 'deposit', status: 'pending', amount: 300 }] })
    expect(await ensureBalancePayment('order1', 'mercadopago')).toBeNull()
    expect(mocks.upsertPayment).not.toHaveBeenCalled()
  })

  it('keeps a created balance link when customer notification fails', async () => {
    mocks.findOrder.mockResolvedValueOnce({ ...order, quote: { total: 1000 }, payments: [{ type: 'deposit', status: 'paid', amount: 300 }] })
    mocks.findCustomer.mockResolvedValue(order.customer)
    mocks.notify.mockRejectedValue(new Error('Email unavailable'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const result = await ensureBalancePayment('order1', 'mercadopago')
      expect(result?.paymentLinkUrl).toBe('https://mp.example/pay')
      expect(log).toHaveBeenCalledWith('[order-payments] Balance notification failed', 'order1')
      expect(JSON.stringify(log.mock.calls)).not.toContain('Email unavailable')
    } finally { log.mockRestore() }
  })
})
