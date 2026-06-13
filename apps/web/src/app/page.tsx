import { db } from '@/lib/db'
import { PublicFooter } from '@/components/public/PublicFooter'

const WA_URL = 'https://wa.me/5215572293512?text=Hola%2C%20quiero%20cotizar%20cajas%20de%20regalo%20CBC'

async function getActiveProducts() {
  return db.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  })
}

export default async function HomePage() {
  const products = await getActiveProducts()

  return (
    <>
      <main>
        <section className="relative overflow-hidden min-h-[90vh] flex items-center cbc-gradient">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="max-w-2xl animate-fade-in">
              <p className="mb-6 text-sm font-semibold tracking-widest uppercase text-cbc-yellow">
                B2B / Regalos Corporativos
              </p>
              <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Eleva la <span className="text-cbc-yellow">Experiencia</span> de tu Marca
              </h1>
              <p className="mt-6 text-xl leading-relaxed text-gray-400">
                Regalos corporativos premium con café de especialidad mexicano. Diseñamos cajas personalizadas que tus clientes y equipo realmente recordarán.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <a href={WA_URL} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center justify-center gap-2 rounded-md bg-cbc-yellow px-8 py-4 text-base font-semibold text-black hover:bg-cbc-yellow/90 transition-all hover:shadow-lg focus-visible:ring-2 focus-visible:ring-cbc-yellow">
                  Hablar con Ventas
                </a>
                <a href="/cotizar"
                   className="inline-flex items-center justify-center rounded-md border border-cbc-yellow/40 px-8 py-4 text-base font-semibold text-cbc-yellow hover:bg-cbc-yellow/10 transition-colors">
                  Ver Catálogo B2B
                </a>
              </div>
            </div>
          </div>
        </section>

        {products.length > 0 && (
          <section className="py-24 bg-cbc-black">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-white">Nuestras Cajas</h2>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                  Elige la experiencia que mejor se adapte a tu equipo o clientes.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {products.map((product) => (
                  <div key={product.id} className="rounded-2xl border border-gray-800 bg-[#1e1e1e] overflow-hidden hover:border-cbc-yellow/30 transition-all group">
                    {product.imageUrl && (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-8">
                      <h3 className="text-2xl font-bold text-white">{product.name}</h3>
                      {product.subtitle && (
                        <p className="mt-1 text-sm text-cbc-yellow">{product.subtitle}</p>
                      )}
                      <p className="mt-4 text-gray-400">{product.description}</p>
                      {(product.features as string[]).length > 0 && (
                        <ul className="mt-6 space-y-2">
                          {(product.features as string[]).map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cbc-yellow shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-8 flex items-center justify-between">
                        <span className="text-3xl font-bold text-white">
                          ${product.price.toLocaleString('es-MX')}
                          <span className="text-sm font-normal text-gray-500 ml-1">MXN</span>
                        </span>
                        <a
                          href={WA_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-md bg-cbc-yellow px-6 py-3 text-sm font-semibold text-black hover:bg-cbc-yellow/90 transition-all"
                        >
                          Cotizar por WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
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
