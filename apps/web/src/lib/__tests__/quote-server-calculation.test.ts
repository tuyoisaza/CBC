import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateQuoteForSave } from '../quote-server-calculation'

const settingRows = [
  { key: 'MIN_QTY_PER_METHOD', value: '10' },
  { key: 'MIN_PRODUCTION_DAYS', value: '15' },
  { key: 'RUSH_MIN_PRODUCTION_DAYS', value: '5' },
  { key: 'RUSH_FEE_PCT', value: '40' },
  { key: 'ADVANCE_PCT', value: '50' },
  { key: 'IVA_PCT', value: '16' },
  { key: 'single_purchase_markup', value: '20' },
]

function dbFor({ zoneName = 'CDMX / Área Metropolitana', extraRows = [] as any[] } = {}) {
  return {
    method: { findMany: vi.fn().mockResolvedValue([{ id: 'method', name: 'Prensa', unitPrice: 100, active: true }]) },
    extra: { findMany: vi.fn().mockResolvedValue(extraRows) },
    shippingZone: { findFirst: vi.fn().mockResolvedValue({ id: 'zone', name: zoneName, baseFee: 100, feePerUnit: 10, active: true }) },
    volumeDiscount: { findMany: vi.fn().mockResolvedValue([]) },
    setting: { findMany: vi.fn().mockResolvedValue(settingRows) },
  }
}

const selection = (qty: number, overrides: Record<string, unknown> = {}) => ({
  items: [{ methodId: 'method', qty }], extras: [], shippingZoneId: 'zone', rush: false, ...overrides,
})

describe('server-side B2B quote rules', () => {
  afterEach(() => vi.useRealTimers())

  it.each([[14, 240], [15, 0], [50, 0]])('applies CDMX shipping for %i kits', async (qty, expectedFee) => {
    const calculated = await calculateQuoteForSave(dbFor(), selection(qty))
    expect(calculated.shippingFee).toBe(expectedFee)
  })

  it('uses the linked box retail base price instead of the method cost', async () => {
    const db = dbFor()
    db.method.findMany.mockResolvedValue([{ id: 'method', name: 'Prensa', unitPrice: 225, active: true, products: [{ name: 'Box Prensa Francesa', price: 799 }] }])
    await expect(calculateQuoteForSave(db, selection(10))).resolves.toMatchObject({
      subtotal: 9588,
      items: [expect.objectContaining({ methodName: 'Prensa', unitPrice: 958.8 })],
    })
  })

  it('rejects Interior del país even when the zone is active', async () => {
    await expect(calculateQuoteForSave(dbFor({ zoneName: 'Interior del país' }), selection(15))).rejects.toThrow('Invalid or inactive shipping zone')
  })

  it('accepts delivery 15 days ahead for a normal order, but rejects 10 days', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-10-01T18:00:00.000Z'))
    const db = dbFor()
    await expect(calculateQuoteForSave(db, selection(10, { deliveryDate: '2026-10-16' }))).resolves.toMatchObject({ deliveryDate: new Date('2026-10-16T00:00:00.000Z') })
    await expect(calculateQuoteForSave(db, selection(10, { deliveryDate: '2026-10-11' }))).rejects.toThrow('Normal delivery requires at least 15 days')
  })

  it('allows a 10-day rush, rejects 3 days, and blocks disallowed extras', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-10-01T18:00:00.000Z'))
    const db = dbFor({ extraRows: [{ id: 'box', unitPrice: 20, allowedForRush: true }, { id: 'print', unitPrice: 20, allowedForRush: false }] })
    await expect(calculateQuoteForSave(db, selection(10, { rush: true, deliveryDate: '2026-10-11', extras: [{ extraId: 'box', qty: 1 }] }))).resolves.toMatchObject({ rush: true })
    await expect(calculateQuoteForSave(db, selection(10, { rush: true, deliveryDate: '2026-10-04' }))).rejects.toThrow('Rush delivery requires at least 5 days')
    await expect(calculateQuoteForSave(db, selection(10, { rush: true, extras: [{ extraId: 'print', qty: 1 }] }))).rejects.toThrow('An extra is not allowed for rush orders')
  })
})
