import Link from 'next/link'
import { Coffee, Calendar, Sparkles, History, Share2 } from 'lucide-react'

export const metadata = { title: 'Marketing Engine' }

const LINKS = [
  { href: '/admin/marketing/coffee',      icon: Coffee,   label: 'Café actual',       desc: 'Actualiza el micro-lote que va en las cajas' },
  { href: '/admin/marketing/generator',   icon: Sparkles, label: 'Generar contenido', desc: 'Crea y publica posts manualmente' },
  { href: '/admin/marketing/schedule',    icon: Calendar, label: 'Calendario',        desc: 'Configura el horario de publicación' },
  { href: '/admin/marketing/history',     icon: History,  label: 'Historial',         desc: 'Posts publicados anteriormente' },
  { href: '/admin/marketing/connections', icon: Share2,   label: 'Conexiones',        desc: 'Autoriza Instagram, Facebook y LinkedIn' },
]

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Marketing Engine</h1>
      <p className="text-muted-foreground">El motor publica automáticamente. Aquí puedes monitorearlo y ajustarlo.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LINKS.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
