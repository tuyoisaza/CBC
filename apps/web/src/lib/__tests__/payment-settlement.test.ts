// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), findPayment: vi.fn(), updatePayment: vi.fn(), findOrder: vi.fn(), updateOrder: vi.fn(), updateQuote: vi.fn(),
  balance: vi.fn(), notify: vi.fn(), confirmation: vi.fn(), notifyB2b: vi.fn(),
}))
const tx = { payment: { findUnique: mocks.findPayment, updateMany: mocks.updatePayment },
  order: { findUniqueOrThrow: mocks.findOrder, update: mocks.updateOrder }, quote: { update: mocks.updateQuote } }
vi.mock('@/lib/db', () => ({ db: { $transaction: mocks.transaction, order: { findUniqueOrThrow: mocks.findOrder } } }))
vi.mock('@/lib/order-payments', () => ({ ensureBalancePayment: mocks.balance }))
vi.mock('@/lib/notifications', () => ({ notifyLorenaRetailOrder: mocks.notify, sendOrderConfirmationToCustomer: mocks.confirmation, notifyLorenaPayment: mocks.notifyB2b }))
import { settlePayment } from '../payment-settlement'
const payment = { id: 'p1', orderId: 'o1', provider: 'mercadopago', amount: 100, currency: 'MXN', type: 'full', status: 'pending', stripePaymentId: null }
const received = { provider: 'mercadopago' as const, externalId: '1234', amount: 100, currency: 'MXN' }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.transaction.mockImplementation(callback => callback(tx))
  mocks.findPayment.mockResolvedValue(payment)
  mocks.updatePayment.mockResolvedValue({ count: 1 })
  mocks.findOrder.mockResolvedValue({ id: 'o1', quoteId: 'q1', orderCode: 'CBC-1', status: 'pending_payment', customer: { contactName: 'Ana' } })
  mocks.balance.mockResolvedValue(null)
  mocks.notify.mockResolvedValue(undefined)
  mocks.confirmation.mockResolvedValue(undefined)
  mocks.notifyB2b.mockResolvedValue(undefined)
})
describe('payment settlement', () => {
  it('updates payment, order and quote inside one transaction', async () => {
    expect(await settlePayment('p1', received)).toEqual({ alreadyProcessed: false })
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.updateOrder).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { status: 'in_production' } })
    expect(mocks.updateQuote).toHaveBeenCalledWith({ where: { id: 'q1' }, data: { status: 'Pagado' } })
    expect(mocks.confirmation).toHaveBeenCalledTimes(1)
  })
  it('does not repeat state changes or notifications for a duplicate', async () => {
    mocks.findPayment.mockResolvedValue({ ...payment, status: 'paid', stripePaymentId: '1234' })
    expect(await settlePayment('p1', received)).toEqual({ alreadyProcessed: true })
    expect(mocks.updatePayment).not.toHaveBeenCalled()
    expect(mocks.confirmation).not.toHaveBeenCalled()
  })
  it('retries balance creation even when the deposit was already committed', async () => {
    mocks.findPayment.mockResolvedValue({ ...payment, type: 'deposit', status: 'paid', stripePaymentId: '1234' })
    mocks.balance.mockRejectedValueOnce(new Error('provider unavailable'))
    await expect(settlePayment('p1', received)).rejects.toThrow('provider unavailable')
    await settlePayment('p1', received)
    expect(mocks.balance).toHaveBeenCalledTimes(2)
    expect(mocks.updatePayment).not.toHaveBeenCalled()
  })
  it('propagates transaction failure without sending confirmation', async () => {
    mocks.updateOrder.mockRejectedValueOnce(new Error('database unavailable'))
    await expect(settlePayment('p1', received)).rejects.toThrow('database unavailable')
    expect(mocks.confirmation).not.toHaveBeenCalled()
    expect(mocks.balance).not.toHaveBeenCalled()
  })
  it('rejects altered amounts and double payment IDs', async () => {
    await expect(settlePayment('p1', { ...received, amount: 1 })).rejects.toThrow('does not match')
    mocks.findPayment.mockResolvedValue({ ...payment, status: 'paid', stripePaymentId: 'another' })
    await expect(settlePayment('p1', received)).rejects.toThrow('different payment')
    expect(mocks.updateOrder).not.toHaveBeenCalled()
  })
  it('does not move a delivered order backwards', async () => {
    mocks.findOrder.mockResolvedValue({ id: 'o1', quoteId: 'q1', orderCode: 'CBC-1', status: 'delivered', customer: {} })
    await settlePayment('p1', received)
    expect(mocks.updateOrder).not.toHaveBeenCalled()
  })
  it('never resurrects refunded payments', async () => {
    mocks.findPayment.mockResolvedValue({ ...payment, status: 'refunded' })
    await settlePayment('p1', received)
    expect(mocks.updateOrder).not.toHaveBeenCalled()
    expect(mocks.confirmation).not.toHaveBeenCalled()
  })
})
