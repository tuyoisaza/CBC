import { db } from '@/lib/db'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'
import { CheckCircle2, Circle, Download, Package } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

const STEPS = [
  { key: 'confirmed',    es: 'Confirmado',      en: 'Confirmed' },
  { key: 'in_production', es: 'En producción',  en: 'In production' },
  { key: 'ready',        es: 'Listo',            en: 'Ready' },
  { key: 'shipped',      es: 'En camino',        en: 'On its way' },
  { key: 'delivered',    es: 'Entregado',        en: 'Delivered' },
]

function stepIndex(status: string) {
  return STEPS.findIndex((s) => s.key === status)
}

export default async function TrackingPage({
  params,
}: {
  params: { code: string; locale: string }
}) {
  const t = await getTranslations('tracking')
  const locale = params.locale as 'es' | 'en'

  const order = await db.order.findUnique({
    where:   { orderCode: params.code.toUpperCase() },
    include: { customer: true, cfdis: true, quote: true },
  })

  const currentStep = order ? stepIndex(order.status) : -1

  return (
    <>
      <PublicHeader />
      <main className="py-16 bg-background min-h-screen">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <Package className="mx-auto h-10 w-10 text-primary mb-4" />
            <h1 className="text-3xl font-bold text-foreground">{t('headline')}</h1>
            <p className="mt-2 text-muted-foreground">{t('sub')}</p>
          </div>

          {!order ? (
            /* Not found state */
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="font-semibold text-foreground">{t('notFound')}</p>
              <p className="mt-1 text-sm text-muted-foreground">Código: {params.code}</p>
            </div>
          ) : (
            /* Order found */
            <div className="space-y-6">
              {/* Order header */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Pedido</p>
                    <p className="text-xl font-bold text-foreground mt-0.5">{order.orderCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Empresa</p>
                    <p className="font-semibold text-foreground">{order.customer.companyName}</p>
                  </div>
                </div>

                {order.estimatedDate && (
                  <div className="mt-4 rounded-lg bg-primary/10 px-4 py-3 text-sm">
                    <span className="text-primary font-medium">Entrega estimada: </span>
                    <span className="text-foreground">
                      {new Date(order.estimatedDate).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress steps */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="space-y-4">
                  {STEPS.map((step, i) => {
                    const done    = i <= currentStep
                    const current = i === currentStep

                    return (
                      <div key={step.key} className="flex items-center gap-4">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          done
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground'
                        }`}>
                          {done
                            ? <CheckCircle2 className="h-4 w-4" />
                            : <Circle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            done ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {locale === 'es' ? step.es : step.en}
                          </p>
                          {current && (
                            <p className="text-xs text-primary mt-0.5">Estado actual</p>
                          )}
                        </div>
                        {current && (
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {order.trackingNumber && order.carrier && (
                  <div className="mt-6 rounded-lg border border-border p-4 text-sm">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Envío</p>
                    <p className="font-medium text-foreground">{order.carrier}</p>
                    <p className="text-muted-foreground font-mono mt-0.5">{order.trackingNumber}</p>
                  </div>
                )}
              </div>

              {/* CFDI download */}
              {order.cfdis.length > 0 && order.cfdis[0].status === 'valid' && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="text-sm font-semibold text-foreground mb-4">Factura electrónica (CFDI)</h2>
                  <div className="flex gap-3">
                    {order.cfdis[0].pdfUrl && (
                      <a
                        href={order.cfdis[0].pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        {t('downloadCfdi')}
                      </a>
                    )}
                    {order.cfdis[0].xmlUrl && (
                      <a
                        href={order.cfdis[0].xmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        XML
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
