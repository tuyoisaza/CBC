'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saleUnit, type CatalogEntry } from '@/lib/extra-catalog'

export function CatalogView({ entries, lang = 'es' }: { entries: CatalogEntry[]; lang?: 'es' | 'en' }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const es = lang === 'es'
  const visible = entries.filter(entry => (kind === 'all' || entry.kind === kind) && `${entry.name} ${entry.description} ${entry.shortDescription} ${entry.unitLabel}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  return <>
    <div className="mb-8 grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-gray-300">{es ? 'Buscar en el catálogo' : 'Search catalog'}
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={es ? 'Filtros, prensa francesa, cajas…' : 'Filters, French press, boxes…'} className="input-field mt-2 w-full" />
      </label>
      <label className="text-sm text-gray-300">{es ? 'Tipo de producto' : 'Product type'}
        <select value={kind} onChange={event => setKind(event.target.value)} className="input-field mt-2 w-full">
          <option value="all">{es ? 'Todos' : 'All'}</option>
          <option value="method">{es ? 'Kits y métodos' : 'Kits and brewing methods'}</option>
          <option value="extra">{es ? 'Accesorios y personalización' : 'Accessories and customization'}</option>
        </select>
      </label>
    </div>
    <p role="status" className="mb-4 text-sm text-gray-400">{visible.length} {es ? 'productos para explorar' : 'products to explore'}</p>
    {!visible.length && <p className="rounded-xl border border-gray-800 p-8 text-center text-gray-400">{es ? 'No hay productos que coincidan con tu búsqueda.' : 'No matching products.'}</p>}
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map(entry => {
        const href = `${es ? '' : '/en'}/catalogo-b2b/${entry.kind}/${encodeURIComponent(entry.slug)}`
        return <article key={`${entry.kind}-${entry.id}`} className="flex flex-col overflow-hidden rounded-2xl border border-gray-800 bg-[#1e1e1e]">
          <Link href={href} aria-label={`${es ? 'Ver' : 'View'} ${entry.name}`}>
            {entry.images[0] ? <img src={entry.images[0]} alt={entry.name} loading="lazy" className="aspect-video w-full object-contain" /> : <div className="flex aspect-video items-center justify-center bg-gray-900 text-sm text-gray-500">{es ? 'Sin imagen' : 'No image'}</div>}
          </Link>
          <div className="flex flex-1 flex-col p-6">
            <p className="mb-2 text-xs uppercase tracking-widest text-cbc-yellow">{entry.kind === 'method' ? (es ? 'Kits y métodos' : 'Kits and methods') : (es ? 'Accesorio / personalización' : 'Accessory / customization')}</p>
            <h2 className="text-xl font-bold text-cbc-cream"><Link href={href}>{entry.name}</Link></h2>
            <p className="mt-3 line-clamp-3 text-sm text-gray-400">{entry.shortDescription}</p>
            <p className="mt-4 text-sm text-gray-300">{saleUnit(entry)} · {es ? 'Mínimo' : 'Minimum'} {entry.minQty}</p>
            <p className="mt-2 font-semibold text-cbc-cream">{entry.price === 0 ? (es ? 'Gratis' : 'Free') : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(entry.price)} <span className="text-xs font-normal text-gray-400">MXN / {entry.unitLabel} · {es ? 'con IVA' : 'tax included'}</span></p>
            <p className="mt-2 text-xs text-gray-400">{entry.kind === 'method' ? (es ? 'Cotiza por volumen.' : 'Request a bulk quote.') : entry.sellableStandalone ? (es ? 'Cotizable sin comprar un kit.' : 'Available without a kit purchase.') : (es ? 'Complemento de un kit.' : 'Kit add-on.')}</p>
            <Link href={href} className="mt-6 block rounded-lg border border-cbc-yellow/40 px-4 py-3 text-center font-semibold text-cbc-yellow hover:bg-cbc-yellow/10">{es ? 'Ver detalles' : 'View details'}</Link>
          </div>
        </article>
      })}
    </div>
  </>
}
