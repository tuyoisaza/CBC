'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
import type { KanbanLead } from './LeadsKanban'

export function ArchivedLeadRow({ lead }: { lead: KanbanLead }) {
  const router = useRouter()
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState(false)

  async function restore() {
    setRestoring(true)
    setError(false)
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      router.refresh()
    } catch {
      setError(true)
      setRestoring(false)
    }
  }

  return (
    <div className="flex items-center gap-4 p-4">
      <Link href={`/admin/sales/leads/${lead.id}`} className="min-w-0 flex-1">
        <p className="font-semibold text-sm text-foreground truncate">{lead.companyName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {lead.contactName}
          {lead.boxType ? ` · ${lead.boxType}` : ''}
          {lead.quantity ? ` · ${lead.quantity} cajas` : ''}
        </p>
      </Link>
      {error && <span className="text-xs text-red-500 dark:text-red-400">Error</span>}
      <button
        type="button"
        onClick={restore}
        disabled={restoring}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {restoring ? 'Restaurando…' : 'Restaurar'}
      </button>
    </div>
  )
}
