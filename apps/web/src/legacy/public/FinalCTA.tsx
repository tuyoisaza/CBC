import { useTranslations } from 'next-intl'

const WA_URL = 'https://wa.me/5215572293512?text=Hola%2C%20quiero%20cotizar%20cajas%20de%20regalo%20CBC'

export function FinalCTA() {
  const t = useTranslations('finalCta')

  return (
    <section className="bg-cbc-black dark:bg-cbc-black py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-balance text-4xl font-bold text-cbc-cream sm:text-5xl">
          {t('headline')}
        </h2>
        <p className="mt-6 text-lg text-cbc-black-50">{t('sub')}</p>

        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center gap-2 rounded-md bg-primary px-10 py-5 text-lg font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/20"
        >
          {t('cta')}
        </a>

        <div className="mt-6 space-y-1">
          <p className="text-sm text-cbc-black-50">{t('detail')}</p>
          <p className="text-sm text-cbc-black-80">{t('detail2')}</p>
        </div>
      </div>
    </section>
  )
}
