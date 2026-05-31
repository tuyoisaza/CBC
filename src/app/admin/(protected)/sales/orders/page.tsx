import { db } from '@/lib/db'
import Link from 'next/link'

export const metadata = { title: 'Pedidos' }

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmado', in_production: 'En producción',
  ready: 'Listo', shipped: 'En camino', delivered: 'Entregado', cancelled: 'Cancelado',
}

export default async function OrdersPage() {
  const orders = await db.order.findMany({
    include: { customer: true, quote: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Pedidos activos</h1>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Código','Empresa','Cajas','Total MXN','Estado','Fecha'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/sales/orders/${o.id}`} className="font-mono text-xs text-primary hover:underline">{o.orderCode}</Link>
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{o.customer.companyName}</td>
                <td className="px-4 py-3 text-muted-foreground">{(o.quote.items as any[]).reduce((s,i)=>s+i.quantity,0)}</td>
                <td className="px-4 py-3 font-semibold text-foreground">${o.quote.total.toLocaleString('es-MX')}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">
                    {STATUS_LABEL[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString('es-MX')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
