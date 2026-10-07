import 'server-only'
import { db, withDbRetry } from '@/lib/db'
import { getSingleMarkupPct } from '@/lib/pricing'
import { catalogImages, type CatalogEntry } from './extra-catalog'

/** Only public selling prices leave the server; never serialize Extra.unitPrice (cost). */
export async function getB2BCatalog(): Promise<CatalogEntry[]> {
  const [methods, extras, settings, markup] = await withDbRetry(() => Promise.all([
    db.method.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, include: {
      products: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
    } }),
    db.extra.findMany({ where: { active: true, catalogVisible: true }, orderBy: { sortOrder: 'asc' } }),
    db.setting.findMany({ where: { key: { in: ['IVA_PCT', 'MIN_QTY_PER_METHOD'] } } }),
    getSingleMarkupPct(),
  ]))
  const config = Object.fromEntries(settings.map(row => [row.key, row.value]))
  const iva = Number(config.IVA_PCT ?? 16)
  const minimum = Number(config.MIN_QTY_PER_METHOD ?? 10)
  const sellingPrice = (cost: number) => Math.round(cost * (1 + markup / 100) * (1 + iva / 100) * 100) / 100
  return [
    ...methods.map((method): CatalogEntry => {
      const kit = method.products[0]
      return {
        id: method.id, slug: method.id, kind: 'method', name: kit?.name ?? method.name,
        shortDescription: kit?.subtitle ?? method.description?.slice(0, 200) ?? '',
        description: method.description || kit?.description || '',
        images: catalogImages({ images: kit?.images, imageUrl: method.imageUrl }),
        features: kit?.features ?? [], price: sellingPrice(kit?.price ?? method.unitPrice),
        unitLabel: kit ? 'kit' : 'unidad', unitsPerPack: 1, minQty: minimum,
        sellableStandalone: true, allowedForRush: true,
      }
    }),
    ...extras.map((extra): CatalogEntry => ({
      id: extra.id, slug: extra.slug || extra.id, kind: 'extra', name: extra.name,
      shortDescription: extra.shortDescription || extra.description?.slice(0, 200) || '',
      description: extra.description || '', images: catalogImages(extra), features: [],
      price: sellingPrice(extra.unitPrice), unitLabel: extra.unitLabel, unitsPerPack: extra.unitsPerPack,
      minQty: extra.minQty, sellableStandalone: extra.sellableStandalone, allowedForRush: extra.allowedForRush,
    })),
  ]
}
