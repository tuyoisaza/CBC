import { db } from '@/lib/db'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'
import { SettingsForm } from '@/components/admin/SettingsForm'

export const metadata = { title: 'Sitio y precios' }

const SETTINGS_KEYS = [
  'site_logo_url', 'logo_size', 'logo_alignment', 'logo_link',
  'single_purchase_markup', 'wholesale_markup_pct',
  'retail_shipping_cost', 'retail_free_shipping_threshold',
]

async function getSettings() {
  const rows = await db.setting.findMany({
    where: { key: { in: SETTINGS_KEYS }, encrypted: false },
  })
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sitio y precios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Logo y márgenes del sitio.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 px-5 py-4">
        <p className="text-sm text-foreground">
          El estado de los proveedores y los métodos de cobro se administran en{' '}
          <Link href="/admin/payments" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            <CreditCard className="h-3.5 w-3.5" /> Pagos
          </Link>
          . Los superadministradores gestionan las credenciales en Configuración.
        </p>
      </div>

      <SettingsForm
        logoUrl={settings['site_logo_url'] || ''}
        logoSize={settings['logo_size'] || 'medium'}
        logoAlignment={settings['logo_alignment'] || 'left'}
        logoLink={settings['logo_link'] || ''}
        singlePurchaseMarkup={settings['single_purchase_markup'] || '20'}
        wholesaleMarkup={settings['wholesale_markup_pct'] || '0'}
        retailShippingCost={settings['retail_shipping_cost'] || '150'}
        retailFreeShippingThreshold={settings['retail_free_shipping_threshold'] || '800'}
      />
    </div>
  )
}
