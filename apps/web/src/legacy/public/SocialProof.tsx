import { useTranslations } from 'next-intl'

export function SocialProof() {
  const t = useTranslations('proof')

  // Will be populated from DB as orders come in
  const testimonials: any[] = []

  if (testimonials.length === 0) return null

  return (
    <section className="py-24 bg-muted/20 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="mb-12 text-center text-sm font-semibold uppercase tracking-widest text-primary">
          {t('tag')}
        </p>
        {/* Testimonials grid — populated dynamically */}
      </div>
    </section>
  )
}
