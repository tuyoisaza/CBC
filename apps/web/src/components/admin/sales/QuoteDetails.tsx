type SavedQuote = {
  items: unknown
  extraItems?: unknown
  subtotal: number
  discount?: number
  discountPct?: number
  shippingFee?: number
  rushFee?: number
  iva: number
  total: number
  advanceAmount?: number
  advancePct?: number
  shippingZone?: { name: string } | null
  deliveryDate?: Date | string | null
  rush?: boolean
  notes?: string | null
  messageCard?: string | null
  logoUrl?: string | null
  pdfUrl?: string | null
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function money(value: unknown) {
  const amount = number(value)
  return amount === null ? '—' : `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function rows(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item: unknown) => {
    const row = item && typeof item === 'object' && !Array.isArray(item)
      ? item as Record<string, unknown> : {}
    const type = text(row.type)
    const typeLabel = type === 'shipping' ? 'Envío' : type === 'prensa' ? 'Prensa francesa' : type === 'moka' ? 'Moka' : type
    return {
      name: text(row.methodName) ?? text(row.name) ?? text(row.description) ?? typeLabel ?? 'Producto sin descripción guardada',
      quantity: number(row.qty) ?? number(row.quantity),
      unitPrice: number(row.unitPrice),
      lineTotal: number(row.lineTotal) ?? number(row.subtotal),
      isShipping: type === 'shipping',
    }
  })
}

function safeUrl(value: string | null | undefined) {
  if (!value) return null
  if (value.startsWith('/') && !value.startsWith('//') && !/[\\\u0000-\u001f\u007f]/.test(value)) return value
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? value : null
  } catch {
    return null
  }
}

function SavedItems({ value, label }: { value: unknown; label: string }) {
  const items = rows(value)
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">{label}</h4>
      {items.length ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" aria-label={label}>
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">Concepto</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Precio unitario</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 min-w-32 break-words">{item.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{item.quantity ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{money(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-sm text-muted-foreground">{label === 'Extras' && Array.isArray(value) ? 'Sin extras' : 'No se guardó el detalle de estos conceptos.'}</p>}
    </div>
  )
}

/** Render the saved quote snapshot without consulting current catalog prices. */
export function QuoteDetails({ quote }: { quote: SavedQuote }) {
  const extras = rows(quote.extraItems)
  const extrasTotal = Array.isArray(quote.extraItems) && extras.every(item => item.lineTotal !== null)
    ? extras.reduce((sum, item) => sum + item.lineTotal!, 0) : null
  const deliveryDate = quote.deliveryDate ? new Date(quote.deliveryDate) : null
  const logoUrl = safeUrl(quote.logoUrl)
  const pdfUrl = safeUrl(quote.pdfUrl)
  const totals = [
    ['Subtotal', quote.subtotal],
    [`Descuento${quote.discountPct ? ` (${quote.discountPct}%)` : ''}`, quote.discount],
    ['Extras', extrasTotal],
    // Older retail quotes already include shipping as an item.
    ...(!rows(quote.items).some(item => item.isShipping) || quote.shippingFee ? [['Envío', quote.shippingFee]] : []),
    ['Cargo por urgencia', quote.rushFee],
    ['IVA', quote.iva],
    ['Total cotizado', quote.total],
    [`Anticipo cotizado${quote.advancePct ? ` (${quote.advancePct}%)` : ''}`, quote.advanceAmount],
  ] as const

  return (
    <div className="mt-4 space-y-5 text-foreground">
      <p className="text-xs text-muted-foreground">Detalle e importes guardados al crear la cotización.</p>
      <SavedItems value={quote.items} label="Productos cotizados" />
      <SavedItems value={quote.extraItems} label="Extras" />
      <div className="grid gap-5 sm:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <div><dt className="text-muted-foreground">Zona de entrega</dt><dd>{quote.shippingZone?.name || 'No registrada'}</dd></div>
          <div><dt className="text-muted-foreground">Fecha de entrega solicitada</dt><dd>{deliveryDate && Number.isFinite(deliveryDate.getTime()) ? deliveryDate.toLocaleDateString('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : 'No registrada'}</dd></div>
          <div><dt className="text-muted-foreground">Entrega urgente</dt><dd>{quote.rush === undefined ? 'No registrada' : quote.rush ? 'Sí' : 'No'}</dd></div>
        </dl>
        <dl className="space-y-2 rounded-lg bg-muted/30 p-4 text-sm">
          {totals.map(([label, amount]) => (
            <div key={label} className={`flex justify-between gap-3 ${label === 'Total cotizado' ? 'border-t border-border pt-2 font-semibold' : ''}`}>
              <dt>{label}</dt><dd className="text-right tabular-nums whitespace-nowrap">{money(amount)}</dd>
            </div>
          ))}
        </dl>
      </div>
      {quote.messageCard && <div className="text-sm"><h4 className="font-semibold mb-1">Mensaje para la tarjeta</h4><p className="whitespace-pre-wrap break-words text-muted-foreground">{quote.messageCard}</p></div>}
      {quote.notes && <div className="text-sm"><h4 className="font-semibold mb-1">Notas de la cotización</h4><p className="whitespace-pre-wrap break-words text-muted-foreground">{quote.notes}</p></div>}
      {(logoUrl || pdfUrl) && <div className="flex flex-wrap gap-4 text-sm">
        {logoUrl && <a href={logoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver logo adjunto</a>}
        {pdfUrl && <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver PDF de la cotización</a>}
      </div>}
    </div>
  )
}
