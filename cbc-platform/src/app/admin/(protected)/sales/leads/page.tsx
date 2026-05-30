import { db } from '@/lib/db'
import Link from 'next/link'
import { Plus, Clock } from 'lucide-react'

export const metadata = { title: 'Ventas — Leads' }

const STAGES = [
  { key: 'new',       label: 'Nuevo',      color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contactado', color: 'bg-purple-500' },
  { key: 'quoted',    label: 'Cotizado',   color: 'bg-amber-500' },
  { key: 'confirmed', label: 'Confirmado', color: 'bg-green-500' },
  { key: 'lost',      label: 'Perdido',    color: 'bg-red-400' },
]

async function getLeads() {
  return db.lead.findMany({
    include: { customer: true, quotes: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  })
}

function daysAgo(date: Date) {
  const diff = Date.now() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default async function LeadsPage() {
  const leads = await getLeads()

  const byStatus = Object.fromEntries(
    STAGES.map((s) => [s.key, leads.filter((l) => l.status === s.key)])
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de Ventas</h1>
          <p className="text-sm text-muted-foreground mt-1">{leads.length} leads totales</p>
        </div>
        <Link
          href="/admin/sales/leads/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo lead
        </Link>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(({ key, label, color }) => {
          const stageLeads = byStatus[key] || []
          return (
            <div key={key} className="flex-shrink-0 w-72">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-2 w-2 rounded-full ${color}`} />
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {stageLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/admin/sales/leads/${lead.id}`}
                    className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <p className="font-semibold text-sm text-foreground truncate">
                      {lead.customer.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lead.customer.contactName}
                    </p>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {lead.boxType && (
                        <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium capitalize">
                          {lead.boxType}
                        </span>
                      )}
                      {lead.quantity && (
                        <span className="text-xs text-muted-foreground">
                          {lead.quantity} cajas
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{daysAgo(lead.createdAt)} días</span>
                      {lead.quotes.length > 0 && (
                        <span className="ml-auto text-primary">📄 Cotizado</span>
                      )}
                    </div>
                  </Link>
                ))}

                {stageLeads.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <p className="text-xs text-muted-foreground">Sin leads</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
