import Link from 'next/link'
import { db, withDbRetry } from '@/lib/db'
import { PublicFooter } from '@/components/public/PublicFooter'
import { CotizadorWizard } from './components/CotizadorWizard'
import { t } from '@/lib/i18n'
import { getSingleMarkupPct, getWholesaleMarkupPct, priceWithTax } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

const PUBLIC_KEYS = ['MIN_PRODUCTION_DAYS', 'RUSH_DAYS_THRESHOLD', 'RUSH_MIN_PRODUCTION_DAYS', 'RUSH_FEE_PCT', 'ADVANCE_PCT', 'MIN_QTY_PER_METHOD', 'IVA_PCT']

export default async function CotizarPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>
}) {
  const [methods, extras, shippingZones, volumeDiscounts, products, settings, markupPct, wholesaleMarkupPct] = await withDbRetry(() =>
    Promise.all([
      db.method.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      db.extra.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      db.shippingZone.findMany({ where: { active: true, name: { not: 'Interior del país' } }, orderBy: { sortOrder: 'asc' } }),
      db.volumeDiscount.findMany({ orderBy: { minQty: 'asc' } }),
      db.product.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      db.setting.findMany({ where: { key: { in: PUBLIC_KEYS } } }),
      getSingleMarkupPct(),
      getWholesaleMarkupPct(),
    ]),
  )

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  settingsMap.SINGLE_PURCHASE_MARKUP_PCT = String(markupPct)
  settingsMap.WHOLESALE_MARKUP_PCT = String(wholesaleMarkupPct)

  const params = await searchParams
  const tr = (path: string) => t('es', path)

  if (!params.product) {
    return (
      <main className="min-h-screen bg-cbc-black py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">← Volver al inicio</Link>
          <header className="mb-10 text-center">
            <p className="text-sm font-semibold tracking-widest uppercase text-cbc-yellow">Catálogo B2B</p>
            <h1 className="mt-2 text-4xl font-bold text-cbc-cream">Explora nuestros kits</h1>
            <p className="mx-auto mt-3 max-w-2xl text-gray-400">Revisa los contenidos, métodos y opciones de personalización antes de iniciar tu cotización.</p>
          </header>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {products.map((product) => {
              const method = methods.find((item) => item.id === product.methodId)
              return <article key={product.id} className="overflow-hidden rounded-2xl border border-gray-800 bg-[#1e1e1e]">
                {product.images[0] ? <img src={product.images[0]} alt={product.name} className="aspect-[16/9] w-full object-cover" /> : <div className="aspect-[16/9] bg-gray-900" />}
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-cbc-cream">{product.name}</h2>
                  {product.subtitle && <p className="mt-1 text-cbc-yellow">{product.subtitle}</p>}
                  <p className="mt-3 text-gray-400">{product.description}</p>
                  {product.images.length > 1 && <div className="mt-4 grid grid-cols-4 gap-2">{product.images.slice(1).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${product.name}, vista ${index + 2}`} className="aspect-square w-full rounded-md object-cover" />)}</div>}
                  {product.features.length > 0 && <ul className="mt-4 space-y-1 text-sm text-gray-300">{product.features.map((feature, index) => <li key={index}>• {feature}</li>)}</ul>}
                  <p className="mt-5 text-lg font-semibold text-cbc-cream">Desde ${priceWithTax(product.price, markupPct).toLocaleString('es-MX')} MXN <span className="text-xs font-normal text-gray-500">precio de referencia con IVA</span></p>
                  <div className="mt-5 border-t border-gray-800 pt-4">
                    <h3 className="text-sm font-semibold text-cbc-yellow">Método disponible</h3>
                    {method ? <div className="mt-2 flex items-center gap-3 text-sm text-gray-300">{method.imageUrl && <img src={method.imageUrl} alt="" className="h-12 w-12 rounded object-cover" />}<div><p>{method.name}</p>{method.description && <p className="text-xs text-gray-500">{method.description}</p>}</div></div> : <p className="mt-2 text-sm text-gray-500">Consulta los métodos disponibles al cotizar.</p>}
                  </div>
                  {extras.length > 0 && <div className="mt-4"><h3 className="text-sm font-semibold text-cbc-yellow">Personalizaciones y extras</h3><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{extras.map((extra) => <div key={extra.id} className="flex items-center gap-2 text-sm text-gray-300">{extra.imageUrl && <img src={extra.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />}<span>{extra.name}</span></div>)}</div></div>}
                  <Link href={`/cotizar?product=${product.slug}`} className="mt-6 inline-flex w-full justify-center rounded-md bg-cbc-yellow px-5 py-3 font-semibold text-black hover:bg-cbc-yellow/90">Cotizar este kit</Link>
                </div>
              </article>
            })}
          </div>
        </div>
        <PublicFooter lang="es" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cbc-black py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link
          href={params.product ? `/productos/${params.product}` : '/'}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {params.product ? tr('cotizar.backToProduct') : tr('cotizar.backToHome')}
        </Link>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-cbc-cream mb-4">{tr('cotizar.title')}</h1>
          <p className="text-gray-400">{tr('cotizar.subtitle')}</p>
        </div>
        <CotizadorWizard
          methods={JSON.parse(JSON.stringify(methods))}
          extras={JSON.parse(JSON.stringify(extras))}
          shippingZones={JSON.parse(JSON.stringify(shippingZones))}
          volumeDiscounts={JSON.parse(JSON.stringify(volumeDiscounts))}
          products={JSON.parse(JSON.stringify(products))}
          settings={settingsMap}
          preselectedProduct={params.product}
        />
      </div>
      <PublicFooter lang="es" />
    </main>
  )
}
