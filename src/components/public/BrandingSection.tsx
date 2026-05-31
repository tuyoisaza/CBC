import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { FileImage, MessageSquare } from 'lucide-react'

export function BrandingSection() {
  const t = useTranslations('branding')

  return (
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-balance text-4xl font-bold text-foreground">
              {t('headline')}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {t('body')}
            </p>

            <div className="mt-8 space-y-4">
              {[
                { icon: FileImage, text: t('req1') },
                { icon: MessageSquare, text: t('req2') },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {text}
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Link
                href="/cotizar"
                className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t('cta')}
              </Link>
            </div>
          </div>

          {/* Branding mockup */}
          <div className="grid grid-cols-2 gap-4">
            {/* Box with client branding */}
            <div className="col-span-2 rounded-xl bg-cbc-black border border-primary/20 p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="h-6 w-24 rounded bg-primary/20 flex items-center justify-center">
                  <span className="text-xs text-primary font-semibold">TU LOGO</span>
                </div>
                <div className="text-xs text-cbc-black-50">+</div>
                <div className="text-xs font-bold text-cbc-cream">Coffee Bunn Café</div>
              </div>
              <div className="h-px bg-border/30" />
              <p className="text-xs text-cbc-black-50">
                Tu marca y la nuestra, juntas en cada caja.
              </p>
            </div>
            {/* Dark box */}
            <div className="rounded-xl bg-cbc-black-80 border border-border p-4 flex items-center justify-center aspect-square">
              <span className="text-4xl">📦</span>
            </div>
            {/* Cream box */}
            <div className="rounded-xl bg-cbc-cream border border-border p-4 flex items-center justify-center aspect-square">
              <span className="text-4xl">☕</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
