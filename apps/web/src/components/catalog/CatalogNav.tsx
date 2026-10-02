import Link from 'next/link'

export function CatalogNav({ lang = 'es' }: { lang?: 'es' | 'en' }) {
  const prefix = lang === 'en' ? '/en' : ''
  return <nav aria-label={lang === 'es' ? 'Comprar y cotizar' : 'Browse and quote'} className="flex flex-wrap justify-center gap-3 border-b border-gray-800 bg-cbc-black px-4 py-4">
    <Link href={`${prefix}/catalogo-b2b`} className="rounded-md border border-cbc-yellow/50 px-5 py-2 text-sm font-semibold text-cbc-yellow hover:bg-cbc-yellow/10">{lang === 'es' ? 'Catálogo B2B' : 'B2B catalog'}</Link>
    <Link href={`${prefix}/cotizar`} className="rounded-md bg-cbc-yellow px-5 py-2 text-sm font-semibold text-black hover:bg-cbc-yellow/90">{lang === 'es' ? 'Cotizar' : 'Get a quote'}</Link>
  </nav>
}
