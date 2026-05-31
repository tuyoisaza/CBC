'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUSES = [
  { value: 'confirmed',     label: 'Confirmado' },
  { value: 'in_production', label: 'En producción' },
  { value: 'ready',         label: 'Listo' },
  { value: 'shipped',       label: 'En camino' },
  { value: 'delivered',     label: 'Entregado' },
  { value: 'cancelled',     label: 'Cancelado' },
]

export function OrderStatusUpdater({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleChange(value: string) {
    setSaving(true)
    setStatus(value)
    try {
      await fetch(`/api/admin/orders?id=${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: value }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground cursor-pointer"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  )
}
