import { expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ extras: vi.fn(), methods: vi.fn() }))
vi.mock('@/lib/db', () => ({ withDbRetry: (fn: () => unknown) => fn(), db: {
  method: { findMany: mocks.methods }, extra: { findMany: mocks.extras },
  setting: { findMany: async () => [{ key: 'IVA_PCT', value: '16' }] },
} }))
vi.mock('@/lib/pricing', () => ({ getWholesaleMarkupPct: async () => 20 }))
import { getB2BCatalog } from '../b2b-catalog'

it('only requests active/visible extras and returns sale prices, never internal costs', async () => {
  mocks.methods.mockResolvedValue([])
  mocks.extras.mockResolvedValue([{ id: 'filters', slug: null, name: 'Filtros', description: 'Texto existente', shortDescription: null, imageUrl: '/old.jpg', images: [], unitPrice: 100, unitLabel: 'paquete', unitsPerPack: 100, minQty: 5, sellableStandalone: true, allowedForRush: true }])
  const rows = await getB2BCatalog()
  expect(mocks.extras).toHaveBeenCalledWith(expect.objectContaining({ where: { active: true, catalogVisible: true } }))
  expect(rows[0]).toMatchObject({ slug: 'filters', price: 139.2, images: ['/old.jpg'], description: 'Texto existente' })
  expect(rows[0]).not.toHaveProperty('unitPrice')
})
it('reuses the existing method/kit record and its images without changing its commercial identity', async () => {
  mocks.extras.mockResolvedValue([])
  mocks.methods.mockResolvedValue([{ id: 'press', name: 'Prensa', unitPrice: 100, description: null, imageUrl: null, products: [{ name: 'Kit Prensa', description: 'Incluye café', images: ['/kit.jpg'], features: ['Café incluido'] }] }])
  expect((await getB2BCatalog())[0]).toMatchObject({ id: 'press', name: 'Kit Prensa', kind: 'method', unitLabel: 'kit', price: 139.2, images: ['/kit.jpg'] })
})
