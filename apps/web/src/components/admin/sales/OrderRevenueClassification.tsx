'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function OrderRevenueClassification({ orderId, reason }: { orderId: string; reason: string | null }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function change(value: string) {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/orders?id=${encodeURIComponent(orderId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revenueExclusionReason: value || null }),
      })
      if (!response.ok) throw new Error('No se pudo guardar la clasificación. Inténtalo de nuevo.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={`revenue-${orderId}`}>Clasificación de venta</label>
      <select id={`revenue-${orderId}`} value={reason || ''} disabled={saving}
        onChange={event => change(event.target.value)}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
        <option value="">Normal — cuenta únicamente lo pagado</option>
        <option value="test">Prueba — excluir de ingresos</option>
        <option value="not_completed">Venta no concretada — excluir de ingresos</option>
      </select>
      <p className="text-xs text-muted-foreground">Conserva el historial. Puedes volver a Normal para incluir sus pagos. Esta clasificación no cancela cobros, reembolsa ni envía mensajes al cliente.</p>
      {saving && <p role="status" className="text-xs text-muted-foreground">Guardando…</p>}
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
