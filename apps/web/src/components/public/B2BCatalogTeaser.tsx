'use client'

import Link from 'next/link'
import type { B2BCatalogTeaserItem } from '@/lib/b2b-catalog'

export function B2BCatalogTeaser({
  items,
  lang = 'es',
}: {
  items: B2BCatalogTeaserItem[]
  lang?: 'es' | 'en'
}) {
  if (items.length === 0) return null

  const es = lang === 'es'
  const catalogHref = es ? '/catalogo-b2b' : '/en/catalogo-b2b'
  const copies = Math.max(1, Math.ceil(12 / items.length))
  const loopItems = Array.from({ length: copies }, () => items).flat()
  const duration = `${Math.max(30, loopItems.length * 3)}s`

  return (
    <section className="mt-8">
      <div
        role="region"
        aria-label={es ? 'Imágenes del catálogo B2B' : 'B2B catalog images'}
        aria-roledescription={es ? 'carrusel' : 'carousel'}
        tabIndex={0}
        className="b2b-teaser-viewport overflow-x-auto overflow-y-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cbc-yellow"
      >
        <div className="b2b-teaser-track flex w-max" style={{ animationDuration: duration }}>
          {[0, 1].map((sequence) => (
            <div
              key={sequence}
              aria-hidden={sequence === 1}
              className="b2b-teaser-group flex w-max shrink-0 gap-3 pr-3"
            >
              {loopItems.map((item, index) => (
                <Link
                  key={`${sequence}-${item.id}-${index}`}
                  href={catalogHref}
                  aria-label={sequence === 0 ? `${es ? 'Ver catálogo B2B:' : 'View B2B catalog:'} ${item.name}` : undefined}
                  tabIndex={sequence === 0 ? undefined : -1}
                  className="group block h-[66px] w-[88px] shrink-0 overflow-hidden rounded-lg border border-gray-800/70 bg-[#1e1e1e] transition-[border-color,opacity] duration-300 hover:border-cbc-yellow/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cbc-yellow"
                >
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-contain p-1 transition-transform duration-500 group-hover:scale-105"
                  />
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
