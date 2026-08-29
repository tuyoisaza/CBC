import { db } from '@/lib/db'

export const SINGLE_PURCHASE_MARKUP_KEY = 'single_purchase_markup'
export const DEFAULT_MARKUP_PCT = 20
export const WHOLESALE_MARKUP_KEY = 'wholesale_markup_pct'
export const DEFAULT_WHOLESALE_MARKUP_PCT = 0
export const TAX_RATE = 0.16 // 16% IVA

/**
 * Final all-in price the customer actually pays for a single-unit purchase
 * (base price × single-purchase markup, per the `single_purchase_markup` setting).
 */
export async function getSingleMarkupPct(): Promise<number> {
  const setting = await db.setting.findUnique({ where: { key: SINGLE_PURCHASE_MARKUP_KEY } })
  return parseFloat(setting?.value || String(DEFAULT_MARKUP_PCT))
}

/**
 * Markup applied to bulk/wholesale orders (10+ units in the quotation wizard),
 * per the `wholesale_markup_pct` setting. Defaults to 0 (at-cost + tax), which is
 * intentionally lower than the single-purchase markup — buying in volume should
 * cost less per unit than buying a single retail box.
 */
export async function getWholesaleMarkupPct(): Promise<number> {
  const setting = await db.setting.findUnique({ where: { key: WHOLESALE_MARKUP_KEY } })
  return parseFloat(setting?.value || String(DEFAULT_WHOLESALE_MARKUP_PCT))
}

export function markedUpPrice(basePrice: number, markupPct: number): number {
  return Math.round(basePrice * (1 + markupPct / 100) * 100) / 100
}

/**
 * Price including markup and tax - what the customer actually pays
 */
export function priceWithTax(basePrice: number, markupPct: number): number {
  const withMarkup = markedUpPrice(basePrice, markupPct)
  return Math.round(withMarkup * (1 + TAX_RATE) * 100) / 100
}

/**
 * Calculate pre-tax amount from a final price (for invoice display)
 */
export function priceBeforeTax(finalPrice: number): number {
  return Math.round((finalPrice / (1 + TAX_RATE)) * 100) / 100
}

/**
 * Calculate tax amount from final price
 */
export function taxAmount(finalPrice: number): number {
  return Math.round(finalPrice - priceBeforeTax(finalPrice))
}
