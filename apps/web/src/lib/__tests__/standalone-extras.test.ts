import { describe, expect, it, vi } from 'vitest'
import { calculateQuoteForSave } from '../quote-server-calculation'
import { catalogImages, saleUnit, requestedQuantity, deliveryDateAfter } from '../extra-catalog'
import { extraWriteSchema, extraWriteData } from '../extra-schema'
import { quoteSaleUnits } from '../quote-records'

const extra = { id: 'filters', name: 'Filtros', unitPrice: 100, active: true, sellableStandalone: true, unitLabel: 'paquete', unitsPerPack: 100, minQty: 5, allowedForRush: true }
const selection = { items: [], extras: [{ extraId: 'filters', qty: 50 }], shippingZoneId: 'zone', rush: false }
function database() {
  return {
    method: { findMany: vi.fn().mockResolvedValue([{ id: 'method', name: 'Kit', unitPrice: 100 }]) },
    extra: { findMany: vi.fn().mockResolvedValue([extra]) },
    shippingZone: { findFirst: vi.fn().mockResolvedValue({ id: 'zone', name: 'CDMX / Área Metropolitana', active: true, baseFee: 0, feePerUnit: 15 }) },
    volumeDiscount: { findMany: vi.fn().mockResolvedValue([{ minQty: 10, maxQty: null, discountPct: 10 }]) },
    setting: { findMany: vi.fn().mockResolvedValue([{ key: 'wholesale_markup_pct', value: '20' }]) },
  }
}

describe('standalone B2B extras', () => {
  it('quotes 50 packages of 100 filters as 50 sale units, not 5000', async () => {
    const quote = await calculateQuoteForSave(database(), selection)
    expect(quote.items).toEqual([])
    expect(quote.extrasTotal).toBe(6000)
    expect(quote.subtotal).toBe(0)
    expect(quote.discount).toBe(0)
    expect(quote.shippingFee).toBe(750)
    expect(quote.total).toBe(7830)
    expect(quote.advanceAmount).toBe(3915)
    expect(quote.extras[0]).toMatchObject({ qty: 50, unitPrice: 120, lineTotal: 6000, unitLabel: 'paquete', unitsPerPack: 100, description: 'Filtros — paquete de 100 piezas' })
  })
  it('charges the configured rush fee on an extras-only order', async () => {
    expect((await calculateQuoteForSave(database(), { ...selection, rush: true })).rushFee).toBe(2400)
  })
  it('preserves kit shipping and discount rules in a mixed order', async () => {
    const quote = await calculateQuoteForSave(database(), { ...selection, items: [{ methodId: 'method', qty: 15 }] })
    expect(quote.shippingFee).toBe(0)
    expect(quote.discount).toBe(180)
    expect(quote.extrasTotal).toBe(6000)
    expect(quote.items[0].unitPrice).toBe(120)
  })
  it('does not count accessories towards the 15-kit free-shipping threshold', async () => {
    const quote = await calculateQuoteForSave(database(), { ...selection, items: [{ methodId: 'method', qty: 14 }] })
    expect(quote.shippingFee).toBe(210)
  })
  it('rejects an empty quote, invalid IDs, inactive products, and small orders', async () => {
    await expect(calculateQuoteForSave(database(), { ...selection, extras: [] })).rejects.toThrow()
    await expect(calculateQuoteForSave(database(), { ...selection, extras: [{ extraId: 'unknown', qty: 50 }] })).rejects.toThrow('Invalid or inactive extra')
    const db = database(); db.extra.findMany.mockResolvedValue([])
    await expect(calculateQuoteForSave(db, selection)).rejects.toThrow('Invalid or inactive extra')
    await expect(calculateQuoteForSave(database(), { ...selection, extras: [{ extraId: 'filters', qty: 1 }] })).rejects.toThrow('mínimo')
  })
  it('rejects an add-on-only quote but preserves add-ons on a kit order', async () => {
    const db = database(); db.extra.findMany.mockResolvedValue([{ ...extra, sellableStandalone: false }])
    await expect(calculateQuoteForSave(db, selection)).rejects.toThrow('complemento')
    await expect(calculateQuoteForSave(db, { ...selection, items: [{ methodId: 'method', qty: 10 }] })).resolves.toMatchObject({ extrasTotal: 6000 })
  })
  it('rejects duplicate lines and fractional, negative or excessive quantities', async () => {
    await expect(calculateQuoteForSave(database(), { ...selection, extras: [...selection.extras, ...selection.extras] })).rejects.toThrow('No repitas')
    for (const qty of [0, -1, 0.5, 100001]) await expect(calculateQuoteForSave(database(), { ...selection, extras: [{ extraId: 'filters', qty }] })).rejects.toThrow()
  })
  it('ignores client prices, labels, package sizes, discounts and totals', async () => {
    const quote = await calculateQuoteForSave(database(), { ...selection, total: 1, discount: 9000, extras: [{ ...selection.extras[0], unitPrice: 0, name: 'Fake', unitsPerPack: 999 }] } as any)
    expect(quote.total).toBe(7830)
    expect(quote.extras[0].unitsPerPack).toBe(100)
    expect(quote.extras[0].name).toBe('Filtros')
  })
  it('preserves rush and shipping restrictions on extras-only quotes', async () => {
    const db = database(); db.extra.findMany.mockResolvedValue([{ ...extra, allowedForRush: false }])
    await expect(calculateQuoteForSave(db, { ...selection, rush: true })).rejects.toThrow('rush')
    db.shippingZone.findFirst.mockResolvedValue(null)
    await expect(calculateQuoteForSave(db, selection)).rejects.toThrow('shipping zone')
  })
})

describe('catalog data compatibility', () => {
  it('retains legacy covers and deduplicates images', () => {
    expect(catalogImages({ imageUrl: '/old.jpg' })).toEqual(['/old.jpg'])
    expect(catalogImages({ images: ['/new.jpg', '/old.jpg'], imageUrl: '/old.jpg' })).toEqual(['/new.jpg', '/old.jpg'])
    expect(catalogImages({})).toEqual([])
  })
  it('updates and clears the legacy quote-email cover with the gallery', () => {
    expect(extraWriteData({ images: ['/new.jpg', '/new.jpg'], imageUrl: '/old.jpg' })).toEqual({ images: ['/new.jpg'], imageUrl: '/new.jpg' })
    expect(extraWriteData({ images: [], imageUrl: '/old.jpg' }).imageUrl).toBeNull()
    expect(extraWriteData({ unitPrice: 0 } as { unitPrice: number; imageUrl?: string })).toEqual({ unitPrice: 0 })
  })
  it('accepts long descriptions, several photos and package presentations', () => {
    const data = { name: 'Filtros', unitPrice: 100, description: 'Descripción larga.\n'.repeat(300), images: ['/api/uploads/extras/a.jpg', 'https://assets.coffeebunncafe.com/b.jpg'], unitLabel: 'paquete', unitsPerPack: 100, minQty: 50, allowedForRush: false }
    expect(extraWriteSchema.parse(data)).toMatchObject(data)
  })
  it.each(['javascript:alert(1)', '//example.com/image.jpg', 'http://example.com/a.jpg', '/\\example.com/a.jpg'])('rejects unsafe image URL %s', url => {
    expect(extraWriteSchema.safeParse({ name: 'Test', unitPrice: 1, images: [url] }).success).toBe(false)
  })
  it('validates photo count, package size and minimum quantity', () => {
    for (const patch of [{ images: Array(13).fill('/a.jpg') }, { unitsPerPack: 0 }, { minQty: 0.5 }, { minQty: -1 }]) expect(extraWriteSchema.safeParse({ name: 'Test', unitPrice: 1, ...patch }).success).toBe(false)
  })
  it('keeps pieces and packages distinct and normalizes incoming quantity', () => {
    expect(saleUnit(extra)).toBe('paquete de 100 piezas')
    expect(saleUnit({})).toBe('pieza')
    expect(requestedQuantity('50', 5)).toBe(50)
    for (const bad of ['-1', '1.5', 'Infinity', '100001', undefined]) expect(requestedQuantity(bad, 5)).toBe(5)
  })
  it('counts saved extras and legacy lines without multiplying package contents', () => {
    expect(quoteSaleUnits({ items: [], extraItems: [{ qty: 50, unitsPerPack: 100 }] })).toBe(50)
    expect(quoteSaleUnits({ items: [{ quantity: 10 }, { qty: 5 }, { type: 'shipping', quantity: 1 }], extraItems: [null, { qty: 50 }] })).toBe(65)
    expect(quoteSaleUnits({ items: null })).toBe(0)
  })
  it('calculates minimum dates using Mexico City rather than UTC date', () => {
    const now = new Date('2026-10-02T01:00:00Z')
    expect(deliveryDateAfter(15, now)).toBe('2026-10-16')
    expect(deliveryDateAfter(5, now)).toBe('2026-10-06')
  })
})
