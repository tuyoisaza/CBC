/** Count sale units in both legacy and current quote JSON; package contents are not order quantities. */
export function quoteSaleUnits(quote: { items: unknown; extraItems?: unknown }): number {
  return [quote.items, quote.extraItems].flatMap(value => Array.isArray(value) ? value : []).reduce((total, row) => {
    if (!row || typeof row !== 'object' || row.type === 'shipping') return total
    const qty = row.qty ?? row.quantity
    return total + (typeof qty === 'number' && Number.isFinite(qty) && qty > 0 ? qty : 0)
  }, 0)
}
