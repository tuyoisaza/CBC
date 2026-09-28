import { getRevenueSummary } from '@/lib/revenue'
import Link from 'next/link'
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react'

export const metadata = { title: 'Revenue Dashboard' }

export default async function RevenuePage() {
  const data = await getRevenueSummary()

  const stats = [
    { label: 'Cobrado este mes', value: `$${data.monthRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Total cobrado',    value: `$${data.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-primary',   bg: 'bg-primary/10' },
    { label: 'Cobrado por pedido',  value: `$${data.avgOrderSize.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Clientes con pagos', value: data.customers, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ]

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold text-foreground">Ingresos cobrados</h1><p className="mt-2 text-sm text-muted-foreground">Solo pagos recibidos en MXN. Se excluyen pedidos cancelados o marcados como prueba o venta no concretada. Archivar un lead no cambia sus ingresos.</p></div>
      <Link href="/admin/sales/orders" className="inline-flex text-sm font-medium text-primary hover:underline">Clasificar pruebas / ventas no concretadas</Link>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className={`inline-flex rounded-lg p-2 ${bg} mb-4`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Pedidos recientes con pagos
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Pedido', 'Empresa', 'Cobrado', 'Estado', 'Fecha de pedido'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">{data.recentOrders.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Todavía no hay pagos recibidos de ventas reales.</td></tr>}
              {data.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground"><Link href={`/admin/sales/orders/${order.id}`} className="text-primary hover:underline">{order.orderCode}</Link></td>
                  <td className="px-4 py-3 text-foreground">{order.customer.companyName}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    ${order.paidAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.status === 'delivered'    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      order.status === 'shipped'      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      order.status === 'in_production' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(order.createdAt).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
