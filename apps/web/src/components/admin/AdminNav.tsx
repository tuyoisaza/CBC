'use client'

import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import {
  LayoutDashboard, ShoppingBag, Megaphone,
  MessageCircle, Settings, LogOut, Sun, Moon, Coffee, Package,
  Beaker, Puzzle, MapPin, Percent
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/sales',     label: 'Ventas',      icon: ShoppingBag },
  { href: '/admin/sales/products', label: 'Productos', icon: Package },
  { href: '/admin/sales/methods', label: 'Métodos', icon: Beaker },
  { href: '/admin/sales/extras', label: 'Extras', icon: Puzzle },
  { href: '/admin/sales/shipping-zones', label: 'Zonas de envío', icon: MapPin },
  { href: '/admin/sales/volume-discounts', label: 'Descuentos', icon: Percent },
  { href: '/admin/marketing', label: 'Marketing',   icon: Megaphone },
  { href: '/admin/service',   label: 'Servicio',    icon: MessageCircle },
  { href: '/admin/settings',  label: 'Config',      icon: Settings },
]

export function AdminNav() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  return (
    <aside className="flex w-16 lg:w-56 flex-col border-r border-border bg-card shrink-0">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Coffee className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="hidden lg:block text-sm font-bold text-foreground">CBC Admin</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 p-2 pt-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden lg:block">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-border space-y-1">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 shrink-0" />
            : <Moon className="h-4 w-4 shrink-0" />}
          <span className="hidden lg:block">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden lg:block">Salir</span>
        </button>
      </div>
    </aside>
  )
}
