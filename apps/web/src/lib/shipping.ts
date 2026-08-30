import { db } from '@/lib/db'

/**
 * Retail (single-purchase) shipping: flat national rate with a free-shipping
 * threshold. Both values are admin-editable settings.
 */

export const RETAIL_SHIPPING_COST_KEY = 'retail_shipping_cost'
export const RETAIL_FREE_SHIPPING_THRESHOLD_KEY = 'retail_free_shipping_threshold'

export const DEFAULT_RETAIL_SHIPPING_COST = 150
// 0 disables the free-shipping threshold (always charge shipping).
export const DEFAULT_RETAIL_FREE_SHIPPING_THRESHOLD = 800

export type RetailShippingConfig = {
  cost: number
  freeThreshold: number
}

export type ShippingQuote = {
  cost: number
  isFree: boolean
  method: 'flat' | 'free'
  freeThreshold: number
}

export async function getRetailShippingConfig(): Promise<RetailShippingConfig> {
  const rows = await db.setting.findMany({
    where: { key: { in: [RETAIL_SHIPPING_COST_KEY, RETAIL_FREE_SHIPPING_THRESHOLD_KEY] } },
  })
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const cost = parseFloat(map[RETAIL_SHIPPING_COST_KEY] ?? '')
  const threshold = parseFloat(map[RETAIL_FREE_SHIPPING_THRESHOLD_KEY] ?? '')
  return {
    cost: Number.isFinite(cost) ? cost : DEFAULT_RETAIL_SHIPPING_COST,
    freeThreshold: Number.isFinite(threshold) ? threshold : DEFAULT_RETAIL_FREE_SHIPPING_THRESHOLD,
  }
}

/**
 * Shipping cost for a retail order, given the goods subtotal (tax-inclusive
 * final price of the items, before shipping).
 */
export function quoteRetailShipping(goodsTotal: number, config: RetailShippingConfig): ShippingQuote {
  const free = config.freeThreshold > 0 && goodsTotal >= config.freeThreshold
  return {
    cost: free ? 0 : config.cost,
    isFree: free,
    method: free ? 'free' : 'flat',
    freeThreshold: config.freeThreshold,
  }
}

export async function getRetailShippingQuote(goodsTotal: number): Promise<ShippingQuote> {
  return quoteRetailShipping(goodsTotal, await getRetailShippingConfig())
}
