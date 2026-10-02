import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getB2BCatalog } from '@/lib/b2b-catalog'
import { saleUnit } from '@/lib/extra-catalog'
import { ProductGallery } from '@/components/productos/ProductGallery'
import { PublicFooter } from '@/components/public/PublicFooter'
import { CatalogNav } from './CatalogNav'
import { CatalogQuoteButton } from './CatalogQuoteButton'

export async function CatalogDetail({ kind, slug, lang = 'es' }: { kind: string; slug: string; lang?: 'es' | 'en' }) {
  if (kind !== 'extra' && kind !== 'method') notFound()
  const entries = await getB2BCatalog()
  const entry = entries.find(item => item.kind === kind && (item.slug === slug || item.id === slug))
  if (!entry) notFound()
  const es = lang === 'es'
  return <><CatalogNav lang={lang} /><main className="min-h-screen bg-cbc-black px-4 py-12 sm:px-6">
    <div className="mx-auto max-w-6xl">
      <Link href={`${es ? '' : '/en'}/catalogo-b2b`} className="text-gray-400 hover:text-white">← {es ? 'Volver al catálogo B2B' : 'Back to B2B catalog'}</Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div className="min-w-0">
        <ProductGallery aspectClass="aspect-video" media={entry.images.map((url, index) => ({ type: 'image', url, thumbnail: url, title: `${entry.name} — ${index + 1}` }))} />
        </div>
        <div>
          <p className="text-sm uppercase tracking-widest text-cbc-yellow">{es ? 'Catálogo B2B' : 'B2B catalog'}</p>
          <h1 className="mt-3 text-3xl font-bold text-cbc-cream">{entry.name}</h1>
          {entry.shortDescription && <p className="mt-4 text-lg text-gray-300">{entry.shortDescription}</p>}
          <p className="mt-5 text-sm text-gray-400">{es ? 'Presentación' : 'Presentation'}: {saleUnit(entry)}</p>
          <p className="mt-3 text-3xl font-bold text-white">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(entry.price)} <span className="text-base font-normal text-gray-400">MXN / {entry.unitLabel}</span></p>
          <p className="mt-2 text-sm text-gray-400">{es ? 'Precio B2B de referencia con IVA. Disponibilidad por confirmar.' : 'Reference B2B price including tax. Availability to be confirmed.'}</p>
          {!entry.allowedForRush && <p className="mt-3 text-sm text-amber-300">{es ? 'No disponible para pedidos urgentes.' : 'Not available for rush orders.'}</p>}
          <CatalogQuoteButton entry={entry} lang={lang} />
        </div>
      </div>
      <section className="mt-12 max-w-4xl border-t border-gray-800 pt-8">
        <h2 className="text-2xl font-bold text-cbc-cream">{es ? 'Descripción y características' : 'Description and features'}</h2>
        <p className="mt-5 whitespace-pre-wrap break-words leading-relaxed text-gray-300">{entry.description || (es ? 'Consulta los detalles de este producto al cotizar.' : 'Ask for product details with your quote.')}</p>
        {entry.features.length > 0 && <ul className="mt-5 list-disc space-y-2 pl-5 text-gray-300">{entry.features.map((feature, i) => <li key={i}>{feature}</li>)}</ul>}
      </section>
    </div>
  </main><PublicFooter lang={lang} /></>
}
