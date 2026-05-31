import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'

const WA_URL = 'https://wa.me/5215572293512?text=Hola%2C%20quiero%20cotizar%20cajas%20de%20regalo%20CBC'

function BoxCard({ nameKey, data }: { nameKey: 'prensa' | 'moka'; data: any }) {
  const t = useTranslations('boxes')

  const features = [
    t(`${nameKey}.feature1`),
    t(`${nameKey}.feature2`),
    t(`${nameKey}.feature3`),
    t(`${nameKey}.feature4`),
  ]

  return (
    <div className="relative flex flex-col rounded-xl border border-border bg-card p-8 shadow-sm hover:shadow-md hover:border-primary/40 transition-all">
      {/* Price badge */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">
          {t(`${nameKey}.name`)}
        </p>
        <p className="mt-1 text-3xl font-bold text-foreground">
          $799 <span className="text-base font-normal text-muted-foreground">MXN</span>
        </p>
        <p className="text-xs text-muted-foreground">por caja</p>
      </div>

      {/* Divider */}
      <div className="mb-6 h-px bg-border" />

      {/* Features */}
      <ul className="mb-8 flex-1 space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {f}
          </li>
        ))}
      </ul>

      {/* Ideal for */}
      <p className="mb-6 text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-3">
        {t(`${nameKey}.ideal`)}
      </p>

      {/* CTA */}
      <a
        href={`${WA_URL}&text=Hola%2C+quiero+cotizar+${nameKey === 'prensa' ? 'Box+Prensa+Francesa' : 'Box+Moka'}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {t(`${nameKey}.cta`)}
      </a>
    </div>
  )
}

export function BoxCards() {
  const t = useTranslations('boxes')

  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            {t('tag')}
          </p>
          <h2 className="text-balance text-4xl font-bold text-foreground">
            {t('headline')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            {t('sub')}
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <BoxCard nameKey="prensa" data={null} />
          <BoxCard nameKey="moka" data={null} />
        </div>

        {/* Footnote */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t('footnote')}
        </p>
      </div>
    </section>
  )
}
