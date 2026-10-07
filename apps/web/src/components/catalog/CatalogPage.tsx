import Link from 'next/link'
import { getB2BCatalog } from '@/lib/b2b-catalog'
import { CatalogNav } from './CatalogNav'
import { CatalogView } from './CatalogView'
import { PublicFooter } from '@/components/public/PublicFooter'

export async function CatalogPage({ lang = 'es' }: { lang?: 'es' | 'en' }) {
  const entries = await getB2BCatalog()
  const es = lang === 'es'
  return <><CatalogNav lang={lang} /><main className="min-h-screen bg-cbc-black px-4 py-12 sm:px-6">
    <div className="mx-auto max-w-6xl">
      <Link href={es ? '/' : '/en'} className="text-sm text-gray-400 hover:text-white">← {es ? 'Volver al inicio' : 'Back home'}</Link>
      <header className="mb-10 mt-8 max-w-3xl">
        <p className="text-sm uppercase tracking-widest text-cbc-yellow">Coffee Bunn Café · B2B</p>
        <h1 className="mt-3 text-4xl font-bold text-cbc-cream sm:text-5xl">{es ? 'Todo para tu siguiente pedido.' : 'Everything for your next order.'}</h1>
        <p className="mt-4 text-lg text-gray-400">{es ? 'Explora kits, métodos, filtros, accesorios y personalizaciones.' : 'Explore kits, brewing methods, filters, accessories and customization.'}</p>
        <p className="mt-3 text-sm text-gray-500">{es ? 'Precios B2B de referencia con IVA. Disponibilidad sujeta a confirmación; los descuentos y el envío se calculan al cotizar.' : 'Reference B2B prices include tax. Availability is subject to confirmation; discounts and shipping are calculated in your quote.'}</p>
      </header>
      <CatalogView entries={entries} lang={lang} />
    </div>
  </main><PublicFooter lang={lang} /></>
}
