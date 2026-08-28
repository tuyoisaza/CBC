import { PublicFooter } from '@/components/public/PublicFooter'
import { t } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default function HomePageEn() {
  const tr = (path: string) => t('en', path)

  return (
    <>
      <main>
        <section className="relative overflow-hidden min-h-[90vh] flex items-center cbc-gradient">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="max-w-2xl animate-fade-in">
              <p className="mb-6 text-sm font-semibold tracking-widest uppercase text-cbc-yellow">
                {tr('home.eyebrow')}
              </p>
              <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                {tr('home.titleStart')} <span className="text-cbc-yellow">{tr('home.titleHighlight')}</span> {tr('home.titleEnd')}
              </h1>
              <p className="mt-6 text-xl leading-relaxed text-gray-400">
                {tr('home.heroDesc')}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <a href="/en/cotizar"
                   className="inline-flex items-center justify-center gap-2 rounded-md bg-cbc-yellow px-8 py-4 text-base font-semibold text-black hover:bg-cbc-yellow/90 transition-all">
                  {tr('home.getQuote')}
                </a>
                <a href="/en/cotizar"
                   className="inline-flex items-center justify-center rounded-md border border-cbc-yellow/40 px-8 py-4 text-base font-semibold text-cbc-yellow hover:bg-cbc-yellow/10 transition-colors">
                  {tr('home.viewCatalog')}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-cbc-black">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">{tr('home.specialtyCoffee')}</h3>
                <p className="text-gray-400">{tr('home.specialtyCoffeeDesc')}</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">{tr('home.customDesign')}</h3>
                <p className="text-gray-400">{tr('home.customDesignDesc')}</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">{tr('home.logistics')}</h3>
                <p className="text-gray-400">{tr('home.logisticsDesc')}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter lang="en" />
    </>
  )
}
