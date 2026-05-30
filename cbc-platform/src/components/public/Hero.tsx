import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

const WA_URL = 'https://wa.me/5215572293512?text=Hola%2C%20quiero%20cotizar%20cajas%20de%20regalo%20CBC'

export function Hero() {
  const t = useTranslations('hero')

  return (
    <section className="relative overflow-hidden bg-cbc-black dark:bg-cbc-black min-h-[90vh] flex items-center">
      {/* Background texture — coffee leaf subtle pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #f7b84e 0%, transparent 50%),
                            radial-gradient(circle at 75% 75%, #f7b84e 0%, transparent 50%)`,
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="max-w-2xl">
          {/* Tag */}
          <p className="mb-6 text-sm font-semibold tracking-widest uppercase text-primary">
            {t('tag')}
          </p>

          {/* Headline */}
          <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight text-cbc-cream sm:text-6xl lg:text-7xl">
            {t('headline')}
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-xl leading-relaxed text-cbc-black-50">
            {t('sub')}
          </p>

          {/* Detail line */}
          <p className="mt-4 text-sm text-cbc-black-50">
            {t('detail')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-8 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 focus-visible:ring-2 focus-visible:ring-primary"
            >
              {/* WhatsApp icon */}
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {t('cta')}
            </a>
            <Link
              href="/cotizar"
              className="inline-flex items-center justify-center rounded-md border border-primary/40 px-8 py-4 text-base font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              Ver catálogo
            </Link>
          </div>

          {/* Sub-CTA */}
          <p className="mt-4 text-xs text-cbc-black-50">
            {t('ctaSub')}
          </p>
        </div>
      </div>
    </section>
  )
}
