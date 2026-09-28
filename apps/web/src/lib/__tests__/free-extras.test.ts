import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), extras: vi.fn(), methods: vi.fn(), zone: vi.fn(), discounts: vi.fn(), settings: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: async () => ({ user: { id: 'admin' } }) }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/logger', () => ({ createLogger: () => ({ error: vi.fn() }) }))
vi.mock('@/lib/db', () => ({
  withDbRetry: (operation: () => unknown) => operation(),
  db: {
    extra: { create: mocks.create, update: mocks.update, findMany: mocks.extras },
    method: { findMany: mocks.methods },
    shippingZone: { findUnique: mocks.zone },
    volumeDiscount: { findMany: mocks.discounts },
    setting: { findMany: mocks.settings },
  },
}))

import { POST as createExtra } from '@/app/api/admin/extras/route'
import { PATCH as updateExtra } from '@/app/api/admin/extras/[id]/route'
import { POST as calculate } from '@/app/api/quote/calculate/route'

const request = (body: unknown) => new NextRequest('http://localhost/api/extras', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

beforeEach(() => {
  vi.resetAllMocks()
  mocks.create.mockImplementation(async ({ data }) => ({ id: 'extra', ...data }))
  mocks.update.mockImplementation(async ({ data }) => ({ id: 'extra', ...data }))
})

describe('free extras', () => {
  it('creates an extra with a zero price', async () => {
    const response = await createExtra(request({ name: 'Tarjeta', unitPrice: 0 }))
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ name: 'Tarjeta', unitPrice: 0 })
    expect(mocks.create).toHaveBeenCalledWith({ data: { name: 'Tarjeta', unitPrice: 0 } })
  })

  it('changes an existing extra to a zero price', async () => {
    const response = await updateExtra(request({ unitPrice: 0 }), { params: { id: 'extra' } })
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'extra' }, data: { unitPrice: 0 } })
  })

  it.each([-1, '', null])('rejects an invalid price %s without writing it', async (unitPrice) => {
    expect((await createExtra(request({ name: 'Tarjeta', unitPrice }))).status).toBe(400)
    expect((await updateExtra(request({ unitPrice }), { params: { id: 'extra' } })).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('keeps every quote amount unchanged when multiple free extras are selected', async () => {
    mocks.methods.mockResolvedValue([{ id: 'method', unitPrice: 100 }])
    mocks.extras.mockResolvedValue([{ id: 'extra', unitPrice: 0 }])
    mocks.zone.mockResolvedValue({ baseFee: 50, feePerUnit: 2 })
    mocks.discounts.mockResolvedValue([{ minQty: 10, maxQty: null, discountPct: 10 }])
    mocks.settings.mockResolvedValue([
      { key: 'wholesale_markup_pct', value: '20' },
      { key: 'IVA_PCT', value: '16' },
      { key: 'RUSH_FEE_PCT', value: '40' },
      { key: 'ADVANCE_PCT', value: '50' },
    ])
    const input = { items: [{ methodId: 'method', qty: 10 }], shippingZoneId: 'zone', rush: true }
    const baseline = await calculate(request({ ...input, extras: [] }))
    const withFreeExtra = await calculate(request({ ...input, extras: [{ extraId: 'extra', qty: 25 }] }))
    expect(baseline.status).toBe(200)
    expect(withFreeExtra.status).toBe(200)
    const baselineAmounts = await baseline.json()
    expect(baselineAmounts.total).toBeGreaterThan(0)
    expect(await withFreeExtra.json()).toEqual({ ...baselineAmounts, extrasTotal: 0 })
  })
})
