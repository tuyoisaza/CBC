import { useTranslations } from 'next-intl'
import { MapPin, Leaf, FileText } from 'lucide-react'

export function CoffeeSection() {
  const t = useTranslations('coffee')

  const features = [
    { icon: MapPin,   title: t('f1title'), body: t('f1body') },
    { icon: Leaf,     title: t('f2title'), body: t('f2body') },
    { icon: FileText, title: t('f3title'), body: t('f3body') },
  ]

  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
              {t('tag')}
            </p>
            <h2 className="text-balance text-4xl font-bold text-foreground leading-tight">
              {t('headline')}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {t('body')}
            </p>

            {/* Features */}
            <div className="mt-10 space-y-6">
              {features.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: placeholder for coffee photo */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-cbc-black border border-border">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Leaf className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-cbc-black-50">
                Foto del micro-lote actual
              </p>
              <p className="text-xs text-cbc-black-80">
                Se actualiza cuando Lorena cambia el café
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
