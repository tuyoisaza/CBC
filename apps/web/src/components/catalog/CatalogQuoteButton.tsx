'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saleUnit, type CatalogEntry } from '@/lib/extra-catalog'

export function CatalogQuoteButton({ entry, lang = 'es' }: { entry: CatalogEntry; lang?: 'es' | 'en' }) {
  const [quantity, setQuantity] = useState(String(entry.minQty))
  const qty = Number(quantity)
  const valid = Number.isSafeInteger(qty) && qty >= entry.minQty && qty <= 100000
  const es = lang === 'es'
  const href = `${es ? '' : '/en'}/cotizar?${entry.kind}=${encodeURIComponent(entry.id)}&qty=${qty}`
  return <div className="mt-6 space-y-4 rounded-xl border border-gray-700 p-5">
    <label className="block text-sm text-gray-300">{es ? 'Cantidad a cotizar' : 'Quote quantity'} ({saleUnit(entry)})
      <input type="number" min={entry.minQty} max={100000} step={1} value={quantity} onChange={event => setQuantity(event.target.value)} className="input-field mt-2 w-full" aria-invalid={!valid} />
    </label>
    <p className="text-xs text-gray-400">{es ? 'Mínimo' : 'Minimum'} {entry.minQty} · {saleUnit(entry)}</p>
    {valid && entry.unitsPerPack > 1 && <p className="text-sm text-cbc-yellow">{qty} × {entry.unitsPerPack} = {(qty * entry.unitsPerPack).toLocaleString('es-MX')} {es ? 'piezas en total' : 'pieces in total'}</p>}
    {!entry.sellableStandalone && <p className="text-sm text-amber-300">{es ? 'Este complemento requiere seleccionar un kit en la cotización.' : 'Select a kit to quote this add-on.'}</p>}
    {valid ? <Link href={href} className="block rounded-lg bg-cbc-yellow px-5 py-3 text-center font-semibold text-black hover:bg-cbc-yellow/90">{es ? 'Cotizar este producto' : 'Quote this product'}</Link> : <button disabled className="w-full rounded-lg bg-gray-700 px-5 py-3 text-gray-400">{es ? 'Ingresa una cantidad válida' : 'Enter a valid quantity'}</button>}
  </div>
}
