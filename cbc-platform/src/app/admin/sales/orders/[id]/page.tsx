import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { OrderStatusUpdater } from '@/components/admin/sales/OrderStatusUpdater'

export const metadata = { title: 'Pedido' }

const STATUS_LABELS: Record<string, string> = {
  confirmed:     'Confirmado',
  in_production: 'En producción',
  ready:         'Listo',
  shipped:       'En camino',
  delivered:     'Entregado',
  cancelled:     'Cancelado',
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      quote: true,
      payments: { orderBy: { createdAt: 'desc' } },
      cfdis: true,
    },
  })
  if (!order) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/sales/leads" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{order.orderCode}</h1>
          <p className="text-sm text-muted-foreground">{order.customer.companyName}</p>
        </div>
        <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order details */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pedido</h2>
          {[
            { label: 'Código',   value: order.orderCode },
            { label: 'Estado',   value: STATUS_LABELS[order.status] },
            { label: 'Total',    value: `$${order.quote.total.toLocaleString('es-MX')} MXN` },
            { label: 'Tracking', value: order.trackingNumber || '—' },
            { label: 'Carrier',  value: order.carrier || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>

        {/* Payments */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pagos</h2>
          {order.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos registrados</p>
          ) : (
            <div className="space-y-3">
              {order.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground capitalize">
                      {p.type === 'deposit' ? 'Anticipo' : 'Saldo final'}
                    </p>
                    <p className="text-xs text-muted-foreground">${p.amount.toLocaleString('es-MX')} MXN</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === 'paid'    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      p.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {p.status === 'paid' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : 'Fallido'}
                    </span>
                    {p.paymentLinkUrl && p.status === 'pending' && (
                      <div>
                        <a href={p.paymentLinkUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline">
                          Ver link de pago
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CFDI section */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">CFDI / Factura</h2>
          {order.cfdis.length === 0 && order.customer.rfc && (
            <button
              onClick={async () => {
                await fetch('/api/admin/cfdi', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderId: order.id, paymentForm: '03' }),
                })
                window.location.reload()
              }}
              className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Generar CFDI
            </button>
          )}
          {!order.customer.rfc && (
            <span className="text-xs text-muted-foreground">Cliente sin RFC registrado</span>
          )}
        </div>
        {order.cfdis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin CFDI emitido</p>
        ) : (
          order.cfdis.map((cfdi) => (
            <div key={cfdi.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-foreground">{cfdi.folio}</p>
                <p className="text-xs text-muted-foreground font-mono">{cfdi.uuid}</p>
              </div>
              <div className="flex gap-2">
                {cfdi.pdfUrl && <a href={cfdi.pdfUrl} target="_blank" className="text-primary text-xs hover:underline">PDF</a>}
                {cfdi.xmlUrl && <a href={cfdi.xmlUrl} target="_blank" className="text-primary text-xs hover:underline">XML</a>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
