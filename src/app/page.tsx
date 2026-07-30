import { AttackPathModal } from '@/components/landing/AttackPathModal';
import { AttackPathModalProvider } from '@/components/landing/AttackPathModalContext';
import { AttackPathSection } from '@/components/landing/AttackPathSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { FinalCtaSection } from '@/components/landing/FinalCtaSection';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { IntroOverlay } from '@/components/landing/IntroOverlay';
import { PullRequestSection } from '@/components/landing/PullRequestSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

/**
 * Landing page.
 *
 * A ordem abaixo é a ordem EFETIVA do site estático, não a do documento
 * original: das 9 `<section>` daquele arquivo, 4 estavam vazias
 * (`Plataforma`, `O problema`, `Ecossistema`, `Diferenciais`) e foram
 * descartadas, e o bloco do ecossistema — que no HTML vivia dentro da seção
 * de Pull Request e era movido para a hero por um script em runtime — agora é
 * renderizado direto dentro de `<HeroSection>`.
 */
export default function LandingPage() {
  return (
    <AttackPathModalProvider>
      <div data-landing className="relative min-h-screen w-full bg-paper text-ink">
        <IntroOverlay />
        <SiteHeader />

        <main>
          <HeroSection />
          <AttackPathSection />
          <HowItWorksSection />
          <PullRequestSection />
          <BenefitsSection />
          <FinalCtaSection />
        </main>

        <SiteFooter />
        <AttackPathModal />
      </div>
    </AttackPathModalProvider>
  );
}
