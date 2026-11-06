import { saleUnit } from '@/lib/extra-catalog'

const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
const money = (value: number) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`

function lines(value: unknown) {
  if (!Array.isArray(value)) throw new Error('No está disponible el detalle guardado de esta cotización.')
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Hay conceptos incompletos en esta cotización.')
    const row = item as Record<string, unknown>
    const name = row.methodName ?? row.name ?? row.description ?? row.type
    const qty = row.qty ?? row.quantity
    const unitPrice = row.unitPrice
    const total = row.lineTotal ?? row.subtotal
    if (typeof name !== 'string' || typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0 || typeof unitPrice !== 'number' || !Number.isFinite(unitPrice) || unitPrice < 0 || typeof total !== 'number' || !Number.isFinite(total) || total < 0) throw new Error('Hay conceptos incompletos en esta cotización. Crea una nueva antes de enviar.')
    const presentation = typeof row.unitLabel === 'string' ? saleUnit({ unitLabel: row.unitLabel, unitsPerPack: typeof row.unitsPerPack === 'number' ? row.unitsPerPack : 1 }) : ''
    return { name, presentation, qty, unitPrice, total }
  })
}

type QuoteEmail = {
  quoteCode: string; items: unknown; extraItems: unknown; subtotal: number; discount: number; discountPct: number;
  shippingFee: number; rushFee: number; iva: number; total: number; advancePct: number; advanceAmount: number;
  deliveryDate: Date | null; expiresAt: Date | null; notes: string | null; messageCard: string | null;
  customer: { contactName: string; companyName: string }; shippingZone: { name: string } | null;
}

/** Uses the immutable saved amounts; never reprices an existing quote from the catalog. */
export function savedQuoteEmail(quote: QuoteEmail) {
  const products = lines(quote.items)
  const extras = lines(quote.extraItems)
  const allLines = [...products, ...extras]
  if (!allLines.length) throw new Error('La cotización no tiene conceptos para enviar.')
  const summary: Array<[string, number]> = [
    ['Subtotal productos', quote.subtotal],
    [`Descuento (${quote.discountPct}%)`, -quote.discount],
    ['Extras', extras.reduce((sum, line) => sum + line.total, 0)],
    ['Envío', quote.shippingFee], ['Urgencia', quote.rushFee], ['IVA', quote.iva], ['Total', quote.total],
    [`Anticipo (${quote.advancePct}%)`, quote.advanceAmount],
  ]
  if (summary.some(([, value]) => !Number.isFinite(value))) throw new Error('La cotización contiene importes inválidos.')
  const date = (value: Date) => value.toLocaleDateString('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#262626;line-height:1.6">
    <h2>Coffee Bunn Café</h2><p>Hola ${escape(quote.customer.contactName)},</p>
    <p>Te compartimos la cotización <strong>${escape(quote.quoteCode)}</strong> para ${escape(quote.customer.companyName)}.</p>
    <table style="width:100%;border-collapse:collapse" cellpadding="8"><thead><tr><th align="left">Concepto</th><th>Cantidad</th><th>Precio unitario</th><th>Importe</th></tr></thead>
    <tbody>${allLines.map(line => `<tr><td>${escape(line.name)}${line.presentation ? `<br>${escape(line.presentation)}` : ''}</td><td>${line.qty}</td><td>${money(line.unitPrice)}</td><td>${money(line.total)}</td></tr>`).join('')}</tbody></table>
    <p>Precios de conceptos antes de IVA; el impuesto se desglosa abajo.</p>
    <table style="width:100%" cellpadding="5">${summary.map(([label, value]) => `<tr><td>${escape(label)}</td><td align="right">${money(value)}</td></tr>`).join('')}</table>
    ${quote.shippingZone ? `<p>Entrega: ${escape(quote.shippingZone.name)}</p>` : ''}
    ${quote.deliveryDate ? `<p>Fecha de entrega solicitada: ${date(quote.deliveryDate)}</p>` : ''}
    ${quote.expiresAt ? `<p>Vigencia: ${date(quote.expiresAt)}</p>` : ''}
    ${quote.messageCard ? `<p>Mensaje para la tarjeta: ${escape(quote.messageCard)}</p>` : ''}
    ${quote.notes ? `<p>Notas: ${escape(quote.notes)}</p>` : ''}
    <p>Para confirmar los detalles o resolver cualquier duda, responde a este correo.</p>
  </div>`
}
