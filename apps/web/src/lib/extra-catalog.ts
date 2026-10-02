/** Shared presentation helpers: quantities always count sale units, not package contents. */
export function catalogImages(item: { images?: string[]; imageUrl?: string | null }): string[] {
  return [...new Set([...(item.images ?? []), item.imageUrl].filter((url): url is string => !!url))]
}

export function saleUnit(item: { unitLabel?: string | null; unitsPerPack?: number | null }): string {
  const label = item.unitLabel?.trim() || 'pieza'
  const size = item.unitsPerPack ?? 1
  return size > 1 ? `${label} de ${size} piezas` : label
}

export function requestedQuantity(value: string | undefined, minimum: number): number {
  const qty = Number(value)
  return Number.isSafeInteger(qty) && qty >= minimum && qty <= 100000 ? qty : minimum
}

export type CatalogEntry = {
  id: string
  slug: string
  kind: 'extra' | 'method'
  name: string
  shortDescription: string
  description: string
  images: string[]
  features: string[]
  price: number
  unitLabel: string
  unitsPerPack: number
  minQty: number
  sellableStandalone: boolean
  allowedForRush: boolean
}

/** Calendar-date arithmetic in CBC's timezone (independent of the buyer's browser). */
export function deliveryDateAfter(days: number, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = (type: string) => parts.find(part => part.type === type)!.value
  const date = new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
