import Link from 'next/link'
import { CatalogNav } from '@/components/catalog/CatalogNav'
import { PublicFooter } from './PublicFooter'

type LegalDocumentProps = {
  lang: 'es' | 'en'
  title: string
  eyebrow: string
  updatedAt: string
  children: React.ReactNode
}

export function LegalDocument({ lang, title, eyebrow, updatedAt, children }: LegalDocumentProps) {
  return (
    <div className="min-h-screen bg-cbc-black text-cbc-cream">
      <CatalogNav lang={lang} />
      <main className="py-16 sm:py-24">
        <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <header className="rounded-2xl border border-cbc-yellow/30 bg-[#1a1a1a] px-6 py-10 shadow-xl sm:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cbc-yellow">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-cbc-cream sm:text-5xl">{title}</h1>
            <p className="mt-4 text-sm text-gray-400">{updatedAt}</p>
          </header>

          <div className="mt-8 rounded-2xl border border-gray-800 bg-[#1a1a1a] px-6 py-8 shadow-xl sm:px-10 sm:py-10">
            <div className="legal-content space-y-10 text-base leading-8 text-gray-300">{children}</div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            {lang === 'es' ? '¿Tienes dudas? ' : 'Have questions? '}
            <Link className="font-semibold text-cbc-yellow hover:underline" href={lang === 'es' ? '/contacto' : '/en/contacto'}>
              {lang === 'es' ? 'Contáctanos.' : 'Contact us.'}
            </Link>
          </p>
        </article>
      </main>
      <PublicFooter lang={lang} />
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-cbc-cream">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  )
}
