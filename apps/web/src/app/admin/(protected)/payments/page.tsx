import {
  getPaymentConfig,
  checkStripeStatus,
  checkMercadoPagoStatus,
  secretKeyChecklist,
  PROVIDER_LABELS,
  type ProviderStatus,
} from '@/lib/payment-config'
import { PaymentsSettingsForm } from '@/components/admin/PaymentsSettingsForm'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export const metadata = { title: 'Pagos' }
export const dynamic = 'force-dynamic'

function ModeBadge({ mode }: { mode: 'live' | 'test' | null }) {
  if (!mode) return null
  const live = mode === 'live'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        live
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      }`}
    >
      {live ? 'LIVE' : 'TEST'}
    </span>
  )
}

function StatusCard({ status }: { status: ProviderStatus }) {
  const Icon = !status.configured ? AlertCircle : status.ok ? CheckCircle2 : XCircle
  const tone = !status.configured
    ? 'text-amber-600 dark:text-amber-400'
    : status.ok
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{PROVIDER_LABELS[status.provider]}</span>
        <ModeBadge mode={status.mode} />
        <Icon className={`ml-auto h-5 w-5 ${tone}`} />
      </div>
      <p className={`mt-2 text-xs ${tone}`}>{status.message}</p>
      {status.account && (
        <p className="mt-2 text-xs text-muted-foreground">
          Cuenta: <span className="font-mono">{status.account}</span>
        </p>
      )}
    </div>
  )
}

export default async function PaymentsPage() {
  const [config, stripe, mercadopago] = await Promise.all([
    getPaymentConfig(),
    checkStripeStatus(),
    checkMercadoPagoStatus(),
  ])
  const secrets = secretKeyChecklist()

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado de los proveedores y configuración del checkout. Las claves secretas se
          administran en Railway → Variables, no aquí.
        </p>
      </div>

      {/* Provider status */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Estado de proveedores</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusCard status={stripe} />
          <StatusCard status={mercadopago} />
        </div>
      </section>

      {/* Editable storefront config */}
      <PaymentsSettingsForm
        singleProviders={config.singleProviders}
        oxxoEnabled={config.oxxoEnabled}
        msiEnabled={config.msiEnabled}
      />

      {/* Secret key checklist (read-only) */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Claves (en Railway)</h2>
        </div>
        <div className="divide-y divide-border">
          {secrets.map((s) => (
            <div key={s.name} className="flex items-start gap-3 px-5 py-3">
              {s.present ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-semibold text-foreground">{s.name}</code>
                  <ModeBadge mode={s.mode} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {s.present ? 'configurada' : 'falta'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border bg-muted/20 px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Para editarlas: Railway → servicio web → pestaña <strong>Variables</strong>. Un cambio
            reinicia el servicio.
          </p>
        </div>
      </section>
    </div>
  )
}
