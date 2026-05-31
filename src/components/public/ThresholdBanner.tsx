import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'

const WA_URL = 'https://wa.me/5215572293512?text=Hola%2C+quiero+cotizar+15+cajas+o+m%C3%A1s'

export function ThresholdBanner() {
  const t = useTranslations('threshold')

  return (
    <section className="bg-cbc-black dark:bg-cbc-black py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Label */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
          <Sparkles className="h-3 w-3" aria-hidden />
          {t('label')}
        </div>

        {/* Headline */}
        <h2 className="text-balance text-4xl font-bold text-cbc-cream sm:text-5xl">
          {t('headline')}
        </h2>

        {/* Body */}
        <p className="mt-6 text-lg leading-relaxed text-cbc-black-50 max-w-2xl mx-auto">
          {t('body')}
        </p>

        {/* Pull quote */}
        <blockquote className="mt-8 border-l-4 border-primary pl-6 text-left max-w-lg mx-auto">
          <p className="text-base italic text-primary/80">{t('quote')}</p>
        </blockquote>

        {/* CTA */}
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center gap-2 rounded-md bg-primary px-8 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/30"
        >
          {t('cta')}
        </a>
      </div>
    </section>
  )
}
