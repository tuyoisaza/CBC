import { PublicFooter } from '@/components/public/PublicFooter'

const WA_URL = 'https://wa.me/5215572293512?text=Hola%2C%20quiero%20cotizar%20cajas%20de%20regalo%20CBC'

export default function HomePage() {
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
