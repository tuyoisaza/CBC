import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CotizadorWizard } from '@/app/cotizar/components/CotizadorWizard'
import { getSingleMarkupPct } from '@/lib/pricing'

export const metadata = { title: 'Crear cotización' }

export default async function NewLeadQuotePage({ params }: { params: { id: string } }) {
  const lead = await db.lead.findUnique({ where: { id: params.id }, include: { customer: true } })
  if (!lead) notFound()
  const [methods, extras, shippingZones, volumeDiscounts, products, settings, markup] = await Promise.all([
    db.method.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    db.extra.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    db.shippingZone.findMany({ where: { active: true, name: { in: ['CDMX / Área Metropolitana', 'Recolección (sin envío)'] } }, orderBy: { sortOrder: 'asc' } }),
    db.volumeDiscount.findMany({ orderBy: { minQty: 'asc' } }),
    db.product.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    db.setting.findMany({ where: { key: { in: ['MIN_PRODUCTION_DAYS', 'RUSH_DAYS_THRESHOLD', 'RUSH_MIN_PRODUCTION_DAYS', 'RUSH_FEE_PCT', 'ADVANCE_PCT', 'MIN_QTY_PER_METHOD', 'IVA_PCT'] } } }),
    getSingleMarkupPct(),
  ])
  const settingsMap = { ...Object.fromEntries(settings.map(setting => [setting.key, setting.value])), SINGLE_PURCHASE_MARKUP_PCT: String(markup) }
  return <div className="max-w-5xl space-y-5">
    <Link href={`/admin/sales/leads/${lead.id}`} className="text-sm text-primary hover:underline">← Volver al lead</Link>
    <h1 className="text-2xl font-bold">Crear cotización para {lead.customer.companyName}</h1>
    <p className="text-sm text-muted-foreground">Selecciona lo que pidió el cliente. Guarda la cotización, revísala y después envíala por correo desde el lead.</p>
    <CotizadorWizard methods={methods} extras={extras} shippingZones={shippingZones} volumeDiscounts={volumeDiscounts} products={products} settings={settingsMap} initialQuantity={lead.quantity ?? undefined}
      adminLead={{ id: lead.id, companyName: lead.customer.companyName, contactName: lead.customer.contactName, email: lead.customer.email }} />
  </div>
}
