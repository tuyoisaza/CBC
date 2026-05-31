'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function FAQ() {
  const t = useTranslations('faq')
  const [open, setOpen] = useState<number | null>(null)

  const items = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    q: t(`q${n}` as any),
    a: t(`a${n}` as any),
  }))

  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center text-4xl font-bold text-foreground">
          {t('headline')}
        </h2>

        <div className="space-y-2">
          {items.map(({ q, a }, i) => (
            <div
              key={i}
              className="rounded-lg border border-border overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-foreground hover:bg-muted/40 transition-colors"
                aria-expanded={open === i}
              >
                <span>{q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-primary transition-transform duration-200 ${
                    open === i ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground border-t border-border/50 pt-4">
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
