'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Archive } from 'lucide-react'

export type KanbanLead = {
  id: string
  status: string
  companyName: string
  contactName: string
  boxType: string | null
  quantity: number | null
  createdAt: string
  hasQuote: boolean
}

type Stage = { key: string; label: string; color: string }

function daysAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function LeadsKanban({
  stages,
  leads: initialLeads,
}: {
  stages: Stage[]
  leads: KanbanLead[]
}) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function moveLead(leadId: string, toStatus: string) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.status === toStatus) return

    const fromStatus = lead.status
    setError(null)
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: toStatus } : l))
    )

    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      router.refresh()
    } catch {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: fromStatus } : l))
      )
      setError('No se pudo mover el lead. Intenta de nuevo.')
    }
  }

  async function archiveLead(leadId: string) {
    const snapshot = leads
    setError(null)
    setArchivingId(leadId)
    setLeads((prev) => prev.filter((l) => l.id !== leadId))

    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      router.refresh()
    } catch {
      setLeads(snapshot)
      setError('No se pudo archivar el lead. Intenta de nuevo.')
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <>
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 pb-4">
        {stages.map(({ key, label, color }) => {
          const stageLeads = leads.filter((l) => l.status === key)
          const isTarget = dragOverStage === key
          return (
            <div
              key={key}
              className="min-w-0"
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOverStage !== key) setDragOverStage(key)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverStage((s) => (s === key ? null : s))
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain')
                setDragOverStage(null)
                setDraggingId(null)
                if (id) moveLead(id, key)
              }}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-2 w-2 rounded-full ${color}`} />
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div
                className={`space-y-3 rounded-xl transition-colors ${
                  isTarget ? 'bg-primary/5 ring-2 ring-primary/30 ring-inset' : ''
                }`}
              >
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', lead.id)
                      setDraggingId(lead.id)
                    }}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDragOverStage(null)
                    }}
                    onClick={() => router.push(`/admin/sales/leads/${lead.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(`/admin/sales/leads/${lead.id}`)
                      }
                    }}
                    className={`group relative block cursor-grab active:cursor-grabbing rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all ${
                      draggingId === lead.id || archivingId === lead.id ? 'opacity-40' : ''
                    }`}
                  >
                    <button
                      type="button"
                      title="Archivar lead"
                      aria-label="Archivar lead"
                      draggable={false}
                      disabled={archivingId === lead.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        archiveLead(lead.id)
                      }}
                      className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-muted hover:text-foreground transition-opacity"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </button>

                    <p className="font-semibold text-sm text-foreground truncate pr-7">
                      {lead.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lead.contactName}
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
                      {lead.hasQuote && (
                        <span className="ml-auto text-primary">📄 Cotizado</span>
                      )}
                    </div>
                  </div>
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
    </>
  )
}
