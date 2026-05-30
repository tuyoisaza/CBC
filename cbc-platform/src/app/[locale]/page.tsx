import { useTranslations } from 'next-intl'
import { PublicHeader } from '@/components/public/PublicHeader'
import { Hero } from '@/components/public/Hero'
import { BoxCards } from '@/components/public/BoxCards'
import { ThresholdBanner } from '@/components/public/ThresholdBanner'
import { CoffeeSection } from '@/components/public/CoffeeSection'
import { BrandingSection } from '@/components/public/BrandingSection'
import { LorenaSection } from '@/components/public/LorenaSection'
import { SocialProof } from '@/components/public/SocialProof'
import { FAQ } from '@/components/public/FAQ'
import { FinalCTA } from '@/components/public/FinalCTA'
import { PublicFooter } from '@/components/public/PublicFooter'
import { WhatsAppFab } from '@/components/public/WhatsAppFab'

export default function LandingPage() {
  return (
    <>
      <PublicHeader />
      <main>
        <Hero />
        <BoxCards />
        <ThresholdBanner />
        <CoffeeSection />
        <BrandingSection />
        <LorenaSection />
        <SocialProof />
        <FAQ />
        <FinalCTA />
      </main>
      <PublicFooter />
      <WhatsAppFab />
    </>
  )
}
