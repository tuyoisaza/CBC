'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, RotateCcw } from 'lucide-react'

export function LeadArchiveButton({
  leadId,
  archived,
}: {
  leadId: string
  archived: boolean
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  async function toggle() {
    setSaving(true)
    setError(false)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !archived }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      router.refresh()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-500 dark:text-red-400">Error</span>}
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
      >
        {archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        {saving ? '…' : archived ? 'Restaurar' : 'Archivar'}
      </button>
    </div>
  )
}
