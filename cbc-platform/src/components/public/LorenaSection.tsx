import { useTranslations } from 'next-intl'

export function LorenaSection() {
  const t = useTranslations('lorena')

  return (
    <section className="py-24 bg-background border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: photo placeholder */}
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-cbc-black border border-border lg:order-first order-last">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-8 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
                ☕
              </div>
              <p className="text-sm text-cbc-black-50 mt-2">Lorena Luna</p>
            </div>
            {/* Yellow accent bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
          </div>

          {/* Right: text */}
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
              {t('tag')}
            </p>
            <h2 className="text-balance text-4xl font-bold text-foreground">
              {t('headline')}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {t('body')}
            </p>

            {/* Quote */}
            <blockquote className="mt-8 border-l-4 border-primary pl-6">
              <p className="text-base italic text-foreground/80">{t('quote')}</p>
              <footer className="mt-3 text-sm font-semibold text-primary">
                — {t('credit')}
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  )
}
