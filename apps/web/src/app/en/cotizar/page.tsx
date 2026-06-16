import { db } from '@/lib/db'
import { PublicFooter } from '@/components/public/PublicFooter'
import { CotizadorWizard } from '@/app/cotizar/components/CotizadorWizard'

export const dynamic = 'force-dynamic'

const PUBLIC_KEYS = ['MIN_PRODUCTION_DAYS', 'RUSH_DAYS_THRESHOLD', 'RUSH_FEE_PCT', 'ADVANCE_PCT', 'MIN_QTY_PER_METHOD', 'IVA_PCT']

export default async function CotizarPageEn({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>
}) {
  const [methods, extras, shippingZones, products, settings] = await Promise.all([
    db.method.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    db.extra.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    db.shippingZone.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    db.product.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    db.setting.findMany({ where: { key: { in: PUBLIC_KEYS } } }),
  ])

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))

  const params = await searchParams

  return (
    <main className="min-h-screen bg-cbc-black py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-cbc-cream mb-4">Get a Quote</h1>
          <p className="text-gray-400">Configure your order and get an instant automatic quote.</p>
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
      <PublicFooter lang="en" />
    </main>
  )
}
