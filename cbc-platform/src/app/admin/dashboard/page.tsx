import { db } from '@/lib/db'
import { getEngineHealth } from '@/lib/engine'
import Link from 'next/link'
import {
  Coffee, ShoppingBag, MessageSquare, TrendingUp,
  Zap, ArrowRight, CheckCircle2, Clock, AlertCircle
} from 'lucide-react'

export const metadata = { title: 'Dashboard — CBC Admin' }

async function getDashboardData() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [
    activeCoffee,
    engineHealth,
    openLeads,
    activeOrders,
    unreadMessages,
    recentPosts,
    monthOrders,
  ] = await Promise.all([
    db.coffee.findFirst({ where: { active: true } }),
    getEngineHealth(),
    db.lead.count({ where: { status: { in: ['new', 'contacted', 'quoted'] } } }),
    db.order.count({ where: { status: { in: ['confirmed', 'in_production', 'ready', 'shipped'] } } }),
    db.message.count({ where: { direction: 'inbound', status: 'unread' } }),
    db.post.findMany({
      orderBy: { createdAt: 'desc' }, take: 5,
      include: { coffee: { select: { name: true } } },
    }),
    db.order.findMany({
      where: { createdAt: { gte: startOfMonth }, status: { not: 'cancelled' } },
      include: { quote: true },
    }),
  ])

  const mrr = monthOrders.reduce((sum, o) => sum + o.quote.total, 0)
  return { activeCoffee, engineHealth, openLeads, activeOrders, unreadMessages, recentPosts, mrr }
}

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', linkedin: '💼',
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const statCards = [
    { label: 'Revenue este mes', value: `$${data.mrr.toLocaleString('es-MX')}`, sub: 'MXN',         icon: TrendingUp,    color: 'text-green-500',  bg: 'bg-green-500/10',  href: '/admin/sales/revenue' },
    { label: 'Leads abiertos',   value: data.openLeads,                          sub: 'por cerrar',  icon: ShoppingBag,   color: 'text-blue-500',   bg: 'bg-blue-500/10',   href: '/admin/sales/leads' },
    { label: 'Pedidos activos',  value: data.activeOrders,                       sub: 'en proceso',  icon: Coffee,        color: 'text-primary',    bg: 'bg-primary/10',    href: '/admin/sales/orders' },
    { label: 'Sin leer',         value: data.unreadMessages,                     sub: 'mensajes',    icon: MessageSquare, color: data.unreadMessages > 0 ? 'text-red-500' : 'text-muted-foreground', bg: data.unreadMessages > 0 ? 'bg-red-500/10' : 'bg-muted', href: '/admin/service' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Buenos días <span className="text-primary">☕</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Engine + Coffee */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Motor de contenido</h2>
            <Link href="/admin/marketing" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${
            data.engineHealth.status === 'running'
              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          }`}>
            <div className={`h-2 w-2 rounded-full shrink-0 ${
              data.engineHealth.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
            }`} />
            <span className="font-medium">
              Motor {data.engineHealth.status === 'running' ? 'activo' : 'offline'}
            </span>
          </div>

          {data.activeCoffee ? (
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
              <Coffee className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{data.activeCoffee.name}</p>
                <p className="text-xs text-muted-foreground">
                  {data.activeCoffee.originRegion} · {(data.activeCoffee.tastingNotes as string[]).slice(0, 2).join(', ')}
                </p>
              </div>
              <Link href="/admin/marketing/coffee" className="text-xs text-primary hover:underline shrink-0">
                Cambiar
              </Link>
            </div>
          ) : (
            <Link href="/admin/marketing/coffee"
              className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              Sin café activo — configura el micro-lote
            </Link>
          )}

          {data.recentPosts.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Últimos posts</p>
              <div className="space-y-2">
                {data.recentPosts.slice(0, 3).map((post) => (
                  <div key={post.id} className="flex items-center gap-3 text-sm">
                    <span className="shrink-0">{PLATFORM_EMOJI[post.platform] || '📱'}</span>
                    <span className="text-muted-foreground flex-1 truncate min-w-0">
                      {post.caption.slice(0, 55)}…
                    </span>
                    {post.status === 'published'
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Acciones rápidas</h2>
          <div className="space-y-2">
            {[
              { href: '/admin/sales/leads/new',     icon: ShoppingBag,   label: 'Nuevo lead',           desc: 'Agregar manualmente' },
              { href: '/admin/marketing/generator',  icon: Zap,           label: 'Generar post ahora',   desc: 'Manual + vista previa' },
              { href: '/admin/marketing/coffee',     icon: Coffee,        label: 'Actualizar micro-lote', desc: 'Cambiar el café activo' },
              { href: '/admin/service',              icon: MessageSquare, label: 'Ver mensajes',         desc: `${data.unreadMessages} sin leer` },
              { href: '/admin/sales/revenue',        icon: TrendingUp,    label: 'Ver revenue',          desc: 'Resumen del mes' },
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
    </div>
  )
}
