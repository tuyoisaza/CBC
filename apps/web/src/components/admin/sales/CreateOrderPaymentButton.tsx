'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PaymentProvider } from '@/lib/payment-config'

export function CreateOrderPaymentButton({ quoteId, defaultProvider, existingProvider }: {
  quoteId: string
  defaultProvider: PaymentProvider
  existingProvider?: PaymentProvider
}) {
  const router = useRouter()
  const [provider, setProvider] = useState<PaymentProvider>(existingProvider ?? defaultProvider)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function preparePayment() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, provider }),
      })
      const result = await response.json()
      if (!response.ok || !result.order?.id) throw new Error(result.error || 'No se pudo preparar el enlace de pago.')
      router.push(`/admin/sales/orders/${encodeURIComponent(result.order.id)}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar el enlace de pago.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <label className="block text-xs text-muted-foreground">
        Proveedor de pago
        <select value={provider} disabled={busy || !!existingProvider} onChange={e => setProvider(e.target.value as PaymentProvider)}
          className="mt-1 w-full rounded-md border border-border bg-card px-2 py-2 text-sm text-foreground">
          <option value="mercadopago">Mercado Pago</option>
          <option value="stripe">Stripe</option>
        </select>
      </label>
      <button type="button" disabled={busy} onClick={preparePayment}
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {busy ? 'Preparando enlace…' : 'Crear / recuperar enlace de anticipo'}
      </button>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
