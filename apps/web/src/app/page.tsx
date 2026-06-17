import Link from 'next/link'
import { db } from '@/lib/db'
import { PublicFooter } from '@/components/public/PublicFooter'

export const dynamic = 'force-dynamic'

const WA_SALES = 'https://wa.me/5215572293512?text=Hola%2C%20quiero%20cotizar%20cajas%20de%20regalo%20CBC'

async function getActiveProducts() {
  try {
    return await db.product.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })
  } catch {
    return []
  }
}

async function getSiteLogo() {
  try {
    const row = await db.setting.findUnique({ where: { key: 'site_logo_url' } })
    return row?.value || ''
  } catch {
    return ''
  }
}

export default async function HomePage() {
  const [products, logoUrl] = await Promise.all([getActiveProducts(), getSiteLogo()])

  return (
    <>
      <main>
        <section className="relative overflow-hidden cbc-gradient">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
            <div className="max-w-2xl animate-fade-in">
              {logoUrl && (
                <img src={logoUrl} alt="Coffee Bunn Café" className="h-16 sm:h-20 mb-6 object-contain" />
              )}
              <p className="mb-3 text-sm font-semibold tracking-widest uppercase text-cbc-yellow">
                B2B / Regalos Corporativos
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Eleva la <span className="text-cbc-yellow">Experiencia</span> de tu Marca
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-gray-400">
                Regalos corporativos premium con café de especialidad mexicano. Diseñamos cajas personalizadas que tus clientes y equipo realmente recordarán.
              </p>

            </div>
          </div>
        </section>

        {products.length > 0 && (
          <section className="py-12 bg-cbc-black">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white">Nuestras Cajas</h2>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                  Elige la experiencia que mejor se adapte a tu equipo o clientes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8">
                {products.map((product) => {
                  const videos = (Array.isArray(product.videos) ? product.videos : []) as { url: string; title?: string }[]
                  const extraImages = product.images.slice(1, 4)
                  return (
                  <div key={product.id} className="rounded-2xl border border-gray-800 bg-[#1e1e1e] overflow-hidden hover:border-cbc-yellow/30 transition-all group">
                    <Link href={`/productos/${product.slug}`}>
                      {product.images.length > 0 ? (
                        <div className="aspect-[16/9] overflow-hidden relative">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {videos.length > 0 && (
                            <span className="absolute top-2 left-2 rounded-full bg-black/60 text-white text-xs px-2 py-0.5 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              Video
                            </span>
                          )}
                          {extraImages.length > 0 && (
                            <div className="absolute bottom-2 right-2 flex gap-1">
                              {extraImages.map((img, i) => (
                                <div key={i} className="w-8 h-8 rounded border border-white/20 overflow-hidden bg-black/40">
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-[16/9] bg-muted flex items-center justify-center text-muted-foreground text-sm">
                          Sin imagen
                        </div>
                      )}
                    </Link>
                    <div className="p-8">
                      <Link href={`/productos/${product.slug}`}>
                        <h3 className="text-2xl font-bold text-white hover:text-cbc-yellow transition-colors">{product.name}</h3>
                      </Link>
                      {product.subtitle && (
                        <p className="mt-1 text-sm text-cbc-yellow">{product.subtitle}</p>
                      )}
                      <p className="mt-4 text-gray-400 line-clamp-2">{product.description}</p>
                      {product.features.length > 0 && (
                        <ul className="mt-6 space-y-2">
                          {product.features.slice(0, 3).map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cbc-yellow shrink-0" />
                              {feature}
                            </li>
                          ))}
                          {product.features.length > 3 && (
                            <li className="text-sm text-gray-500">+{product.features.length - 3} más</li>
                          )}
                        </ul>
                      )}
                      <div className="mt-8 flex items-center justify-between">
                        <span className="text-3xl font-bold text-white">
                          ${product.price.toLocaleString('es-MX')}
                          <span className="text-sm font-normal text-gray-500 ml-1">MXN</span>
                        </span>
                        <div className="flex gap-2">
                          <Link
                            href={`/productos/${product.slug}`}
                            className="inline-flex items-center gap-2 rounded-md border border-cbc-yellow/40 px-4 py-3 text-sm font-semibold text-cbc-yellow hover:bg-cbc-yellow/10 transition-all"
                          >
                            Ver producto
                          </Link>
                          <Link
                            href={`/cotizar?product=${product.slug}`}
                            className="inline-flex items-center gap-2 rounded-md bg-cbc-yellow px-4 py-3 text-sm font-semibold text-black hover:bg-cbc-yellow/90 transition-all"
                          >
                            Cotizar
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>

              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                <a href={WA_SALES} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center justify-center gap-2 rounded-md bg-cbc-yellow px-8 py-4 text-base font-semibold text-black hover:bg-cbc-yellow/90 transition-all hover:shadow-lg focus-visible:ring-2 focus-visible:ring-cbc-yellow">
                  Hablar con Ventas
                </a>
                <a href="/cotizar"
                   className="inline-flex items-center justify-center rounded-md border border-cbc-yellow/40 px-8 py-4 text-base font-semibold text-cbc-yellow hover:bg-cbc-yellow/10 transition-colors">
                  Ver Catálogo B2B
                </a>
              </div>
            </div>
          </section>
        )}

        <section className="py-24 bg-cbc-black">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">Café de Especialidad</h3>
                <p className="text-gray-400">Seleccionamos los mejores granos de México, tostados bajo demanda para garantizar máxima frescura.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">Diseño Personalizado</h3>
                <p className="text-gray-400">Tu logo y branding integrados de forma elegante en cada elemento de la caja de regalo.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">Logística Integral</h3>
                <p className="text-gray-400">Entregamos en volumen a tus oficinas o directamente a la puerta de cada uno de tus clientes.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter lang="es" />
    </>
  )
}
