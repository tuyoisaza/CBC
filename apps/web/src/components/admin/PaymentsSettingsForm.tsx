'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import {
  PAYMENTS_SINGLE_PROVIDERS_KEY,
  PAYMENTS_OXXO_KEY,
  PAYMENTS_MSI_KEY,
  PROVIDER_LABELS,
  type PaymentProvider,
} from '@/lib/payment-config'

type LiveStatus = {
  checkedAt: string
  stripe: { configured: boolean; ok: boolean; mode: string | null; message: string; account?: string }
  mercadopago: { configured: boolean; ok: boolean; mode: string | null; message: string; account?: string }
}

const ALL_PROVIDERS: PaymentProvider[] = ['stripe', 'mercadopago']

async function saveSetting(key: string, value: string) {
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  })
  if (!res.ok) throw new Error(`No se pudo guardar (${res.status})`)
}

export function PaymentsSettingsForm({
  singleProviders: initialProviders,
  oxxoEnabled: initialOxxo,
  msiEnabled: initialMsi,
}: {
  singleProviders: PaymentProvider[]
  oxxoEnabled: boolean
  msiEnabled: boolean
}) {
  const router = useRouter()
  const [providers, setProviders] = useState<PaymentProvider[]>(initialProviders)
  const [oxxo, setOxxo] = useState(initialOxxo)
  const [msi, setMsi] = useState(initialMsi)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [rechecking, setRechecking] = useState(false)
  const [live, setLive] = useState<LiveStatus | null>(null)

  async function toggleProvider(p: PaymentProvider) {
    const next = providers.includes(p) ? providers.filter((x) => x !== p) : [...providers, p]
    if (next.length === 0) {
      setError('Debe quedar al menos un proveedor activo para el checkout.')
      return
    }
    const ordered = ALL_PROVIDERS.filter((x) => next.includes(x))
    setError(null)
    setBusy(`provider:${p}`)
    setProviders(ordered)
    try {
      await saveSetting(PAYMENTS_SINGLE_PROVIDERS_KEY, JSON.stringify(ordered))
      router.refresh()
    } catch (e) {
      setProviders(providers)
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function toggleFlag(
    key: string,
    current: boolean,
    setter: (v: boolean) => void,
  ) {
    const next = !current
    setError(null)
    setBusy(key)
    setter(next)
    try {
      await saveSetting(key, String(next))
      router.refresh()
    } catch (e) {
      setter(current)
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function recheck() {
    setRechecking(true)
    try {
      const res = await fetch('/api/admin/payments/status', { cache: 'no-store' })
      if (res.ok) setLive(await res.json())
    } finally {
      setRechecking(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">Checkout de tienda</h2>
        <button
          onClick={recheck}
          disabled={rechecking}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${rechecking ? 'animate-spin' : ''}`} />
          Volver a verificar
        </button>
      </div>

      <div className="space-y-6 p-5">
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {live && (
          <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-3 text-xs">
            <p className="text-muted-foreground">
              Verificado {new Date(live.checkedAt).toLocaleTimeString('es-MX')}
            </p>
            {(['stripe', 'mercadopago'] as const).map((p) => {
              const s = live[p]
              const Icon = !s.configured ? AlertCircle : s.ok ? CheckCircle2 : XCircle
              const tone = !s.configured
                ? 'text-amber-600 dark:text-amber-400'
                : s.ok
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              return (
                <p key={p} className={`flex items-start gap-1.5 ${tone}`}>
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>{PROVIDER_LABELS[p]}:</strong> {s.message}
                  </span>
                </p>
              )
            })}
          </div>
        )}

        {/* Providers offered on single-purchase */}
        <div>
          <p className="text-sm font-medium text-foreground">Proveedores en “Comprar 1”</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Métodos que verá el cliente al comprar una unidad desde la página de producto.
          </p>
          <div className="space-y-2">
            {ALL_PROVIDERS.map((p) => (
              <label
                key={p}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={providers.includes(p)}
                  disabled={busy === `provider:${p}`}
                  onChange={() => toggleProvider(p)}
                  className="h-4 w-4 rounded border-border"
                />
                {PROVIDER_LABELS[p]}
              </label>
            ))}
          </div>
        </div>

        {/* Payment method toggles */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={oxxo}
              disabled={busy === PAYMENTS_OXXO_KEY}
              onChange={() => toggleFlag(PAYMENTS_OXXO_KEY, oxxo, setOxxo)}
              className="h-4 w-4 rounded border-border"
            />
            <span>
              OXXO (efectivo){' '}
              <span className="text-xs text-muted-foreground">— vouchers en efectivo vía Mercado Pago</span>
            </span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={msi}
              disabled={busy === PAYMENTS_MSI_KEY}
              onChange={() => toggleFlag(PAYMENTS_MSI_KEY, msi, setMsi)}
              className="h-4 w-4 rounded border-border"
            />
            <span>
              Meses sin intereses{' '}
              <span className="text-xs text-muted-foreground">— MSI en tarjetas participantes (Mercado Pago)</span>
            </span>
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          Los cambios se guardan al instante. Se aplican en cuanto el checkout lee la
          configuración (sin necesidad de redeploy).
        </p>
      </div>
    </section>
  )
}
