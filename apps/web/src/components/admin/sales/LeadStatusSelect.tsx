'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = [
  { value: 'new',       label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'quoted',    label: 'Cotizado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'lost',      label: 'Perdido' },
]

export function LeadStatusSelect({
  leadId,
  currentStatus,
}: {
  leadId: string
  currentStatus: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleChange(value: string) {
    setSaving(true)
    setStatus(value)
    try {
      await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: value }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const colorMap: Record<string, string> = {
    new:       'text-blue-600 dark:text-blue-400',
    contacted: 'text-purple-600 dark:text-purple-400',
    quoted:    'text-amber-600 dark:text-amber-400',
    confirmed: 'text-green-600 dark:text-green-400',
    lost:      'text-red-500 dark:text-red-400',
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className={`rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary ${colorMap[status] ?? ''}`}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  )
}
