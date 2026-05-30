import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export function PublicFooter() {
  const t = useTranslations('footer')

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <p className="text-lg font-bold">
              <span className="text-primary">Coffee</span> Bunn Café
            </p>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Regalos corporativos de café de especialidad. Curados por Lorena Luna.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Navegación</p>
            <ul className="space-y-2">
              {[
                { href: '/cotizar' as const, label: 'Cotizar' },
                { href: '/tracking/search' as const, label: 'Rastrear pedido' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Contacto</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>contact@coffeebunncafe.com</p>
              <p>+52 55 72293512</p>
              <p className="mt-2 text-xs">{t('address')}</p>
            </div>
            {/* Social links */}
            <div className="mt-4 flex gap-3">
              {[
                { href: 'https://www.instagram.com/coffeebunncafe/', label: 'Instagram' },
                { href: 'https://www.facebook.com/CoffeeBunnCafe', label: 'Facebook' },
                { href: 'https://www.linkedin.com/company/coffee-bunn-cafe', label: 'LinkedIn' },
              ].map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Coffee Bunn Café. {t('rights')}.</p>
          <p>Empresa legalmente constituida en México · RFC disponible para facturación</p>
        </div>
      </div>
    </footer>
  )
}
