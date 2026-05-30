import { db } from '@/lib/db'
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react'

export const metadata = { title: 'Revenue Dashboard' }

async function getRevenue() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1) // start of this month

  const [
    monthOrders,
    allOrders,
    customers,
    topCustomers,
  ] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: start }, status: { not: 'cancelled' } },
      include: { quote: true },
    }),
    db.order.findMany({
      where: { status: { not: 'cancelled' } },
      include: { quote: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.customer.count(),
    db.order.groupBy({
      by: ['customerId'],
      _count: { id: true },
      _sum:   { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
      where: { status: { not: 'cancelled' } },
    }),
  ])

  const monthRevenue = monthOrders.reduce((sum, o) => sum + o.quote.total, 0)
  const totalRevenue = allOrders.reduce((sum, o)  => sum + o.quote.total, 0)
  const avgOrderSize = allOrders.length > 0
    ? Math.round(totalRevenue / allOrders.length)
    : 0

  return { monthRevenue, totalRevenue, avgOrderSize, customers, allOrders }
}

export default async function RevenuePage() {
  const data = await getRevenue()

  const stats = [
    { label: 'Revenue este mes', value: `$${data.monthRevenue.toLocaleString('es-MX')}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Revenue total',    value: `$${data.totalRevenue.toLocaleString('es-MX')}`, icon: TrendingUp, color: 'text-primary',   bg: 'bg-primary/10' },
    { label: 'Pedido promedio',  value: `$${data.avgOrderSize.toLocaleString('es-MX')}`, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Clientes totales', value: data.customers, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Revenue Dashboard</h1>

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
          Pedidos recientes
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Pedido', 'Empresa', 'Total', 'Estado', 'Fecha'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.allOrders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{order.orderCode}</td>
                  <td className="px-4 py-3 text-foreground">{order.customer.companyName}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    ${order.quote.total.toLocaleString('es-MX')} MXN
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
