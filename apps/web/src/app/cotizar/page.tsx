import Link from 'next/link'
import { db, withDbRetry } from '@/lib/db'
import { PublicFooter } from '@/components/public/PublicFooter'
import { CotizadorWizard } from './components/CotizadorWizard'
import { t } from '@/lib/i18n'
import { getSingleMarkupPct, getWholesaleMarkupPct } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

const PUBLIC_KEYS = ['MIN_PRODUCTION_DAYS', 'RUSH_DAYS_THRESHOLD', 'RUSH_FEE_PCT', 'ADVANCE_PCT', 'MIN_QTY_PER_METHOD', 'IVA_PCT']

export default async function CotizarPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>
}) {
  const [methods, extras, shippingZones, products, settings, markupPct, wholesaleMarkupPct] = await withDbRetry(() =>
    Promise.all([
      db.method.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      db.extra.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      db.shippingZone.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
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
          products={JSON.parse(JSON.stringify(products))}
          settings={settingsMap}
          preselectedProduct={params.product}
        />
      </div>
      <PublicFooter lang="es" />
    </main>
  )
}
