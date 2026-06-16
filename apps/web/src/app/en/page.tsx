import { PublicFooter } from '@/components/public/PublicFooter'

export const dynamic = 'force-dynamic'

export default function HomePageEn() {
  return (
    <>
      <main>
        <section className="relative overflow-hidden min-h-[90vh] flex items-center cbc-gradient">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="max-w-2xl animate-fade-in">
              <p className="mb-6 text-sm font-semibold tracking-widest uppercase text-cbc-yellow">
                B2B / Corporate Gifts
              </p>
              <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Elevate Your <span className="text-cbc-yellow">Brand</span> Experience
              </h1>
              <p className="mt-6 text-xl leading-relaxed text-gray-400">
                Premium corporate gifts featuring Mexican specialty coffee. We design custom boxes that your clients and team will truly remember.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <a href="/en/cotizar"
                   className="inline-flex items-center justify-center gap-2 rounded-md bg-cbc-yellow px-8 py-4 text-base font-semibold text-black hover:bg-cbc-yellow/90 transition-all">
                  Get a Quote
                </a>
                <a href="/en/cotizar"
                   className="inline-flex items-center justify-center rounded-md border border-cbc-yellow/40 px-8 py-4 text-base font-semibold text-cbc-yellow hover:bg-cbc-yellow/10 transition-colors">
                  View B2B Catalog
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-cbc-black">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">Specialty Coffee</h3>
                <p className="text-gray-400">We source the best beans from Mexico, roasted on demand to guarantee peak freshness.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">Custom Design</h3>
                <p className="text-gray-400">Your logo and branding elegantly integrated into every element of the gift box.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">End-to-End Logistics</h3>
                <p className="text-gray-400">We deliver in volume to your offices or directly to the doorstep of every client.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter lang="en" />
    </>
  )
}
