import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProductGallery } from '@/components/productos/ProductGallery'
import { ComprarUnoButton } from '@/components/productos/ComprarUnoButton'

export const dynamic = 'force-dynamic'

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] || null
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
  })
  if (!product) notFound()

  const markupSetting = await db.setting.findUnique({ where: { key: 'single_purchase_markup' } })
  const markupPct = parseFloat(markupSetting?.value || '20')
  const markedUpPrice = Math.round(product.price * (1 + markupPct / 100) * 100) / 100

  const videos = (Array.isArray(product.videos) ? product.videos : []) as { url: string; title?: string }[]

  const allMedia = [
    ...product.images.map((url) => ({ type: 'image' as const, url, thumbnail: url, title: product.name })),
    ...videos.map((v) => {
      const id = getYouTubeId(v.url)
      return {
        type: 'video' as const,
        url: v.url,
        thumbnail: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '',
        title: v.title || product.name,
        videoId: id,
      }
    }),
  ]

  return (
    <main className="min-h-screen bg-cbc-black">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <ProductGallery media={allMedia} />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white">{product.name}</h1>
            {product.subtitle && (
              <p className="mt-1 text-cbc-yellow">{product.subtitle}</p>
            )}
            <p className="mt-6 text-gray-400 leading-relaxed">{product.description}</p>

            {product.features.length > 0 && (
              <ul className="mt-6 space-y-3">
                {product.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-400">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cbc-yellow shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 pt-8 border-t border-gray-800">
              <p className="text-4xl font-bold text-white">
                ${product.price.toLocaleString('es-MX')}
                <span className="text-base font-normal text-gray-500 ml-2">MXN</span>
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <ComprarUnoButton slug={product.slug} markedUpPrice={markedUpPrice} />
              <Link
                href={`/cotizar?product=${product.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-cbc-yellow px-8 py-4 text-base font-semibold text-black hover:bg-cbc-yellow/90 transition-all"
              >
                Cotizar
              </Link>
              <Link
                href="/cotizar"
                className="inline-flex items-center justify-center rounded-md border border-cbc-yellow/40 px-8 py-4 text-base font-semibold text-cbc-yellow hover:bg-cbc-yellow/10 transition-colors"
              >
                Ver Catálogo B2B
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
