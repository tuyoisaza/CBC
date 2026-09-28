import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  session: vi.fn(), findOrder: vi.fn(), updateOrder: vi.fn(), audit: vi.fn(),
  notify: vi.fn(), paymentLink: vi.fn(),
}))
vi.mock('next-auth', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({ db: { order: { findUnique: mocks.findOrder, update: mocks.updateOrder } } }))
vi.mock('@/lib/notifications', () => ({ notifyCustomerOrderStatus: mocks.notify, sendPaymentLinkToCustomer: mocks.paymentLink }))
vi.mock('@/lib/payment-config', () => ({ getPaymentConfig: vi.fn() }))
vi.mock('@/lib/order-payments', () => ({ depositAmount: vi.fn(), ensureOrderPayment: vi.fn() }))
vi.mock('@/lib/audit', () => ({ recordAudit: mocks.audit }))
import { PATCH } from './route'

const existing = {
  id: 'order-1', orderCode: 'CBC-1', status: 'confirmed', revenueExclusionReason: null,
  customer: { whatsapp: '5512345678' },
}
function patch(body: Record<string, unknown>, query = '?id=order-1') {
  return PATCH(new NextRequest(`https://cbc.example/api/admin/orders${query}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }))
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.session.mockResolvedValue({ user: { email: 'admin@example.com' } })
  mocks.findOrder.mockResolvedValue(existing)
  mocks.updateOrder.mockImplementation(({ data }) => Promise.resolve({ ...existing, ...data }))
  mocks.audit.mockResolvedValue(undefined)
})

describe('order revenue classification', () => {
  it('requires authentication before reading or changing an order', async () => {
    mocks.session.mockResolvedValue(null)
    expect((await patch({ revenueExclusionReason: 'test' })).status).toBe(401)
    expect(mocks.findOrder).not.toHaveBeenCalled()
    expect(mocks.updateOrder).not.toHaveBeenCalled()
    expect(mocks.audit).not.toHaveBeenCalled()
  })

  it('requires an order id', async () => {
    expect((await patch({ revenueExclusionReason: 'test' }, '')).status).toBe(400)
    expect(mocks.updateOrder).not.toHaveBeenCalled()
  })

  it.each(['archived', '', 1, false])('rejects an invalid exclusion reason: %s', async reason => {
    expect((await patch({ revenueExclusionReason: reason })).status).toBe(400)
    expect(mocks.updateOrder).not.toHaveBeenCalled()
    expect(mocks.audit).not.toHaveBeenCalled()
  })

  it.each(['test', 'not_completed', null])('persists %s without changing fulfillment or messaging customers', async reason => {
    mocks.findOrder.mockResolvedValue({ ...existing, revenueExclusionReason: 'test' })
    const response = await patch({ revenueExclusionReason: reason })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ revenueExclusionReason: reason, status: 'confirmed' })
    expect(mocks.updateOrder).toHaveBeenCalledWith({
      where: { id: 'order-1' }, data: { revenueExclusionReason: reason }, include: { customer: true },
    })
    expect(mocks.audit).toHaveBeenCalledWith({ actorEmail: 'admin@example.com' }, {
      action: 'update', entity: 'order', entityId: 'order-1',
      metadata: { revenueExclusionReason: reason, previousRevenueExclusionReason: 'test' },
    })
    expect(mocks.notify).not.toHaveBeenCalled()
    expect(mocks.paymentLink).not.toHaveBeenCalled()
  })

  it('returns 404 for a missing order without writing or auditing', async () => {
    mocks.findOrder.mockResolvedValue(null)
    expect((await patch({ revenueExclusionReason: 'not_completed' })).status).toBe(404)
    expect(mocks.updateOrder).not.toHaveBeenCalled()
    expect(mocks.audit).not.toHaveBeenCalled()
    expect(mocks.notify).not.toHaveBeenCalled()
  })

  it('preserves classification when editing fulfillment and keeps its existing notification', async () => {
    expect((await patch({ status: 'shipped', trackingNumber: 'TRACK-1' })).status).toBe(200)
    expect(mocks.updateOrder).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'shipped', trackingNumber: 'TRACK-1' },
    }))
    expect(mocks.audit).not.toHaveBeenCalled()
    expect(mocks.notify).toHaveBeenCalledWith({
      whatsapp: '5512345678', orderCode: 'CBC-1', status: 'shipped', trackingNumber: 'TRACK-1',
    })
  })
})
