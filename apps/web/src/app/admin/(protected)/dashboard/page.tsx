import { openLeadsWhere, activeOrdersWhere, inboxMessagesWhere, unreadMessagesWhere } from '@/lib/admin-filters'
import { db } from '@/lib/db'
import { getMonthlyRevenue } from '@/lib/revenue'
import Link from 'next/link'
import {
  Coffee, ShoppingBag, MessageSquare, TrendingUp,
  ArrowRight
} from 'lucide-react'

export const metadata = { title: 'Dashboard — CBC Admin' }

async function getDashboardData() {

  const [
    openLeads,
    activeOrders,
    unreadMessages,
    totalMessages,
    mrr,
  ] = await Promise.all([
    db.lead.count({ where: openLeadsWhere }),
    db.order.count({ where: activeOrdersWhere }),
    db.message.count({ where: unreadMessagesWhere }),
    db.message.count({ where: inboxMessagesWhere }),
    getMonthlyRevenue(),
  ])

  return { openLeads, activeOrders, unreadMessages, totalMessages, mrr }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const statCards = [
    { label: 'Cobrado este mes', value: `$${data.mrr.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'MXN',         icon: TrendingUp,    color: 'text-green-500',  bg: 'bg-green-500/10',  href: '/admin/sales/revenue' },
    { label: 'Leads abiertos',   value: data.openLeads,                          sub: 'por cerrar',  icon: ShoppingBag,   color: 'text-blue-500',   bg: 'bg-blue-500/10',   href: '/admin/sales/leads?view=open' },
    { label: 'Pedidos activos',  value: data.activeOrders,                       sub: 'en proceso',  icon: Coffee,        color: 'text-primary',    bg: 'bg-primary/10',    href: '/admin/sales/orders?view=active' },
    { label: 'Sin leer',         value: data.unreadMessages,                     sub: `${data.totalMessages} mensajes en total`,    icon: MessageSquare, color: data.unreadMessages > 0 ? 'text-red-500' : 'text-muted-foreground', bg: data.unreadMessages > 0 ? 'bg-red-500/10' : 'bg-muted', href: '/admin/service?view=unread' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Buenos días <span className="text-primary">☕</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}
            className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all">
            <div className={`inline-flex rounded-lg p-2.5 ${bg} mb-4`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            <p className="text-xs text-muted-foreground/70">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Acciones rápidas</h2>
        <div className="space-y-2">
          {[
            { href: '/admin/sales/leads', icon: ShoppingBag, label: 'Ver leads', desc: 'Pipeline de ventas' },
            { href: '/admin/sales/orders', icon: Coffee, label: 'Ver pedidos', desc: 'Todos los pedidos y su clasificación' },
            { href: '/admin/sales/leads/new',     icon: ShoppingBag,   label: 'Nuevo lead',           desc: 'Agregar manualmente' },
            { href: '/admin/sales/products',       icon: Coffee,        label: 'Ver productos',        desc: 'Catálogo B2B' },
            { href: '/admin/service',              icon: MessageSquare, label: 'Ver mensajes',         desc: `${data.totalMessages} mensajes · ${data.unreadMessages} sin leer` },
            { href: '/admin/sales/revenue',        icon: TrendingUp,    label: 'Ver ingresos',          desc: 'Resumen del mes' },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:border-primary/40 hover:bg-muted/30 transition-all">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
