'use client'

import { useRef } from 'react'
import Link from 'next/link'
import type { B2BCatalogTeaserItem } from '@/lib/b2b-catalog'

export function B2BCatalogTeaser({
  items,
  lang = 'es',
}: {
  items: B2BCatalogTeaserItem[]
  lang?: 'es' | 'en'
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  if (items.length === 0) return null

  const es = lang === 'es'
  const catalogHref = es ? '/catalogo-b2b' : '/en/catalogo-b2b'
  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('[data-teaser-card]')
    const distance = (card?.offsetWidth ?? track.clientWidth * 0.8) + 16
    track.scrollBy({ left: direction * distance, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby={`b2b-teaser-title-${lang}`} className="mt-16 border-t border-gray-800 pt-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cbc-yellow">
            {es ? 'Un vistazo a lo que tenemos' : 'A preview of what we offer'}
          </p>
          <h2 id={`b2b-teaser-title-${lang}`} className="text-2xl font-bold text-cbc-cream sm:text-3xl">
            {es ? 'Explora el catálogo B2B' : 'Explore the B2B catalog'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-400 sm:text-base">
            {es
              ? 'Kits, métodos, accesorios y personalización. Desliza para descubrir más.'
              : 'Kits, brewing methods, accessories and customization. Scroll to discover more.'}
          </p>
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            aria-label={es ? 'Desplazar el carrusel a la izquierda' : 'Scroll carousel left'}
            onClick={() => scroll(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 text-cbc-cream transition-colors hover:border-cbc-yellow hover:text-cbc-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cbc-yellow"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={es ? 'Desplazar el carrusel a la derecha' : 'Scroll carousel right'}
            onClick={() => scroll(1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 text-cbc-cream transition-colors hover:border-cbc-yellow hover:text-cbc-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cbc-yellow"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        id={`b2b-teaser-track-${lang}`}
        role="region"
        aria-label={es ? 'Imágenes del catálogo B2B' : 'B2B catalog images'}
        aria-roledescription={es ? 'carrusel' : 'carousel'}
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cbc-yellow sm:mx-0 sm:px-0"
      >
        {items.map((item) => (
          <article
            key={item.id}
            data-teaser-card
            className="group min-w-0 shrink-0 basis-[78%] snap-start sm:basis-[42%] lg:basis-[30%]"
          >
            <Link
              href={catalogHref}
              aria-label={`${es ? 'Abrir catálogo B2B; artículo destacado:' : 'Open B2B catalog; featured item:'} ${item.name}`}
              className="block overflow-hidden rounded-2xl border border-gray-800 bg-[#1e1e1e] transition-colors hover:border-cbc-yellow/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cbc-yellow"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#161616]">
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <h3 className="truncate font-semibold text-cbc-cream group-hover:text-cbc-yellow">{item.name}</h3>
                <span className="shrink-0 text-xs font-semibold text-cbc-yellow">
                  {es ? 'Ver catálogo' : 'View catalog'}
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-5 text-center">
        <Link href={catalogHref} className="inline-flex items-center gap-2 font-semibold text-cbc-yellow hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cbc-yellow">
          {es ? 'Ver todo el catálogo B2B' : 'View the full B2B catalog'}
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14m-7-7 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  )
}
