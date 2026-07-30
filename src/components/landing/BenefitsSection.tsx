import { BENEFIT_CARDS, type BenefitCard } from '@/lib/landing/benefit-cards';
import { GradientText } from './GradientText';

const SVG_PROPS = {
  width: 52,
  height: 52,
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const ICONS: Record<BenefitCard['icon'], React.ReactNode> = {
  gauge: (
    <svg {...SVG_PROPS}>
      <path d="M8 34a16 16 0 1 1 32 0" />
      <path d="M24 34 33 21" stroke="#e5333b" />
      <circle cx="24" cy="34" r="3.2" fill="#e5333b" stroke="none" />
      <path d="M8 34h4M36 34h4M24 12v4" opacity=".55" />
    </svg>
  ),
  cloudExchange: (
    <svg {...SVG_PROPS}>
      <path d="M14 34a8 8 0 0 1-1-15.9A11 11 0 0 1 34 16.5a7 7 0 0 1-1 17.5z" />
      <path d="M21 22l-3 3 3 3M27 22l3 3-3 3" stroke="#e5333b" />
    </svg>
  ),
  cloudFlow: (
    <svg {...SVG_PROPS}>
      <path d="M15 32a8 8 0 0 1-1-15.9A11 11 0 0 1 35 14.5a7 7 0 0 1-1 17.5z" />
      <path d="M25 27l4 4-4 4M20 39l3-11" stroke="#e5333b" />
    </svg>
  ),
};

function Card({ card }: { card: BenefitCard }) {
  return (
    <div className="apr-rev-fade flex flex-col items-center rounded-[14px] border border-transparent p-[22px] px-5 text-center transition-[transform,border-color,background-color] duration-[180ms] hover:-translate-y-[3px] hover:border-card-line hover:bg-card">
      <span
        className="mb-[26px] flex h-[88px] w-[88px] items-center justify-center text-accent-icon"
        style={{ filter: 'drop-shadow(0 0 10px rgba(255,77,84,0.55))' }}
      >
        {ICONS[card.icon]}
      </span>

      <h3 className="mb-[18px] flex min-h-[90px] max-w-[15ch] items-center justify-center font-heading text-[clamp(21px,1.9vw,26px)] font-bold leading-[1.15] tracking-[-0.01em]">
        <GradientText>{card.title}</GradientText>
      </h3>

      <p className="max-w-[38ch] text-[15.5px] leading-[1.65] text-ink-strong">
        {card.body}
      </p>
    </div>
  );
}

/**
 * Faixa de diferenciais.
 *
 * O original simulava o sangramento total com um `::before` de `width:100vw`
 * deslocado em -50%. Aqui a section é realmente full-width e o conteúdo fica
 * num container centralizado — mesmo resultado, sem truque.
 */
export function BenefitsSection() {
  return (
    <section data-landing-section className="relative z-[1] bg-warm">
      <div className="mx-auto grid max-w-[1240px] grid-cols-3 gap-5 px-7 py-16 max-[980px]:grid-cols-1">
        {BENEFIT_CARDS.map((card) => (
          <Card key={card.icon} card={card} />
        ))}
      </div>
    </section>
  );
}
