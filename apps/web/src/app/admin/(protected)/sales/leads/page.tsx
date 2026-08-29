import { db } from '@/lib/db'
import Link from 'next/link'
import { Plus, Archive } from 'lucide-react'
import { LeadsKanban, type KanbanLead } from '@/components/admin/sales/LeadsKanban'
import { ArchivedLeadRow } from '@/components/admin/sales/ArchivedLeadRow'

export const metadata = { title: 'Ventas — Leads' }

const STAGES = [
  { key: 'new',       label: 'Nuevo',      color: 'bg-blue-500' },
  { key: 'contacted', label: 'Contactado', color: 'bg-purple-500' },
  { key: 'quoted',    label: 'Cotizado',   color: 'bg-amber-500' },
  { key: 'confirmed', label: 'Confirmado', color: 'bg-green-500' },
  { key: 'lost',      label: 'Perdido',    color: 'bg-red-400' },
]

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { view?: string }
}) {
  const showArchived = searchParams.view === 'archived'

  const leads = await db.lead.findMany({
    where: { archivedAt: showArchived ? { not: null } : null },
    include: { customer: true, quotes: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: showArchived ? { archivedAt: 'desc' } : { createdAt: 'desc' },
  })

  const kanbanLeads: KanbanLead[] = leads.map((l) => ({
    id: l.id,
    status: l.status,
    companyName: l.customer.companyName,
    contactName: l.customer.contactName,
    boxType: l.boxType,
    quantity: l.quantity,
    createdAt: l.createdAt.toISOString(),
    hasQuote: l.quotes.length > 0,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {showArchived ? 'Leads archivados' : 'Pipeline de Ventas'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{leads.length} leads</p>
        </div>
        <div className="flex items-center gap-2">
          {showArchived ? (
            <Link
              href="/admin/sales/leads"
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              ← Pipeline
            </Link>
          ) : (
            <Link
              href="/admin/sales/leads?view=archived"
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Archive className="h-4 w-4" /> Archivados
            </Link>
          )}
          <Link
            href="/admin/sales/leads/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuevo lead
          </Link>
        </div>
      </div>

      {showArchived ? (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {kanbanLeads.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No hay leads archivados.</p>
          ) : (
            kanbanLeads.map((lead) => <ArchivedLeadRow key={lead.id} lead={lead} />)
          )}
        </div>
      ) : (
        <LeadsKanban stages={STAGES} leads={kanbanLeads} />
      )}
    </div>
  )
}
