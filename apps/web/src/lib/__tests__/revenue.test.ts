import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ aggregate: vi.fn(), count: vi.fn(), findMany: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: {
  payment: { aggregate: mocks.aggregate },
  order: { count: mocks.count, findMany: mocks.findMany },
} }))

import { getMonthlyRevenue, getRevenueSummary } from '../revenue'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.aggregate.mockResolvedValue({ _sum: { amount: null } })
  mocks.count.mockResolvedValue(0)
  mocks.findMany.mockResolvedValue([])
})

describe('collected revenue', () => {
  it('requires paid MXN payments on real, noncancelled orders, independently of archival', async () => {
    await getRevenueSummary()
    for (const [query] of mocks.aggregate.mock.calls) {
      expect(query.where).toMatchObject({ status: 'paid', currency: 'MXN', order: { status: { not: 'cancelled' }, revenueExclusionReason: null } })
      expect(JSON.stringify(query)).not.toContain('archived')
    }
    for (const [query] of [...mocks.count.mock.calls, ...mocks.findMany.mock.calls]) {
      expect(query.where).toEqual({ status: { not: 'cancelled' }, revenueExclusionReason: null, payments: { some: { status: 'paid', currency: 'MXN' } } })
    }
  })

  it('uses payment settlement dates with an exclusive next-month boundary', async () => {
    const now = new Date(2026, 8, 28)
    await getMonthlyRevenue(now)
    expect(mocks.aggregate.mock.calls[0][0].where.paidAt).toEqual({ gte: new Date(2026, 8, 1), lt: new Date(2026, 9, 1) })
    expect(mocks.aggregate.mock.calls[0][0].where).not.toHaveProperty('createdAt')
  })

  it('keeps lifetime totals and averages independent of the 20-row recent list', async () => {
    mocks.aggregate.mockResolvedValueOnce({ _sum: { amount: 300 } }).mockResolvedValueOnce({ _sum: { amount: 9000 } })
    mocks.count.mockResolvedValue(30)
    mocks.findMany.mockResolvedValueOnce([{ customerId: 'a' }, { customerId: 'b' }]).mockResolvedValueOnce(
      Array.from({ length: 20 }, (_, id) => ({ id: String(id), payments: [{ amount: 100 }, { amount: 200 }] })),
    )
    const result = await getRevenueSummary()
    expect(result).toMatchObject({ monthRevenue: 300, totalRevenue: 9000, avgOrderSize: 300, customers: 2 })
    expect(result.recentOrders).toHaveLength(20)
    expect(result.recentOrders[0].paidAmount).toBe(300)
    expect(mocks.aggregate.mock.calls[1][0]).not.toHaveProperty('take')
    expect(mocks.findMany.mock.calls[0][0].distinct).toEqual(['customerId'])
    expect(mocks.findMany.mock.calls[1][0].select.payments.where).toEqual({ status: 'paid', currency: 'MXN' })
  })

  it('returns zero amounts and no customers when there are no real payments', async () => {
    expect(await getRevenueSummary()).toEqual({ monthRevenue: 0, totalRevenue: 0, avgOrderSize: 0, customers: 0, recentOrders: [] })
  })
})
