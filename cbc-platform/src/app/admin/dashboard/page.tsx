import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Coffee, ShoppingBag, Users, TrendingUp } from 'lucide-react'

export const metadata = { title: 'Dashboard' }

async function getStats() {
  try {
    const [leads, orders, customers, coffee] = await Promise.all([
      db.lead.count({ where: { status: { in: ['new', 'contacted'] } } }),
      db.order.count({ where: { status: { notIn: ['delivered', 'cancelled'] } } }),
      db.customer.count(),
      db.coffee.findFirst({ where: { active: true } }),
    ])
    return { leads, orders, customers, coffee }
  } catch {
    return { leads: 0, orders: 0, customers: 0, coffee: null }
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const stats = await getStats()

  const cards = [
    {
      label: 'Leads activos',
      value: stats.leads,
      icon: Users,
      href: '/admin/sales',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Pedidos en curso',
      value: stats.orders,
      icon: ShoppingBag,
      href: '/admin/sales',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Clientes totales',
      value: stats.customers,
      icon: TrendingUp,
      href: '/admin/sales',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Café activo',
      value: stats.coffee?.name ?? 'Sin configurar',
      icon: Coffee,
      href: '/admin/marketing',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenida, Lorena ☕
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, href, color, bg }) => (
          <a
            key={label}
            href={href}
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className={`inline-flex rounded-lg p-2 ${bg} mb-4`}>
              <Icon className={`h-5 w-5 ${color}`} aria-hidden />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </a>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Nuevo lead', href: '/admin/sales/leads/new', icon: '➕' },
            { label: 'Generar cotización', href: '/admin/sales/quotes/new', icon: '📄' },
            { label: 'Actualizar café', href: '/admin/marketing/coffee', icon: '☕' },
            { label: 'Ver pedidos activos', href: '/admin/sales/orders', icon: '📦' },
            { label: 'Revisar mensajes', href: '/admin/service', icon: '💬' },
            { label: 'Disparar post manual', href: '/admin/marketing/generator', icon: '📸' },
          ].map(({ label, href, icon }) => (
            <a
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-all"
            >
              <span className="text-lg">{icon}</span>
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Setup notice if no coffee configured */}
      {!stats.coffee && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            ☕ No hay café activo configurado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            El motor de contenido necesita el café actual para generar posts. Configúralo en{' '}
            <a href="/admin/marketing/coffee" className="text-primary underline">
              Marketing → Café
            </a>
            .
          </p>
        </div>
      )}
    </div>
  )
}
