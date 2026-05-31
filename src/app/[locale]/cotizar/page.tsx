import { useTranslations } from 'next-intl'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'
import { QuoteForm } from '@/components/public/QuoteForm'

export async function generateMetadata() {
  return {
    title: 'Cotiza tu regalo corporativo | Coffee Bunn Café',
    description: 'Solicita una cotización para cajas de regalo de café de especialidad. Respondemos en menos de 2 horas.',
  }
}

export default function CotizarPage() {
  const t = useTranslations('quote')

  return (
    <>
      <PublicHeader />
      <main className="py-16 bg-background min-h-screen">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-foreground">{t('headline')}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{t('sub')}</p>
          </div>
          <QuoteForm />
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
