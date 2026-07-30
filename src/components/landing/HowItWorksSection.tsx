import { LAYER_CARDS, type LayerCard } from '@/lib/landing/layer-cards';
import { GradientText } from './GradientText';

function Card({ card }: { card: LayerCard }) {
  return (
    <div className="apr-rev-fade relative z-[2] rounded-[14px] border border-card-line bg-card p-[26px] pr-6 outline-none transition-[transform,border-color,box-shadow] duration-[180ms] hover:-translate-y-1 hover:border-accent hover:shadow-[0_10px_26px_-14px_rgba(229,51,59,0.45)] focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_rgba(229,51,59,0.25)]">
      <div className={card.badgeClassName}>{card.badge}</div>

      <h3
        className={`mt-4 text-[27px] font-bold tracking-[-0.02em] ${card.titleClassName}`}
      >
        {card.title}
      </h3>
      <p className="mt-1 text-sm text-accent-soft">{card.kicker}</p>
      <p
        className={`mt-3 max-w-[300px] text-[14.5px] leading-[1.6] ${card.bodyClassName}`}
      >
        {card.body}
      </p>

      {/* border-top rgba(58,46,42,.22) para todos os cards — inclusive o 03,
          cuja borda vermelha era sobrescrita em runtime pelo script antigo. */}
      <div
        className={`mt-[18px] pt-[13px] font-mono text-[13.5px] ${card.footerClassName}`}
        style={{ borderTop: '1px solid rgba(58,46,42,0.22)' }}
      >
        {card.footer.map((part, index) => (
          <span key={index} className={part.dim ? 'text-ink-graf' : undefined}>
            {part.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="camadas" data-landing-section className="relative z-[1] bg-warm py-[72px]">
      <div className="mx-auto max-w-[1240px] px-8">
        <h2 className="apr-rev mb-[18px] max-w-[780px] text-[clamp(30px,3.6vw,46px)] font-bold leading-[1.08] tracking-[-0.02em]">
          Do sinal à prova,{' '}
          <GradientText className="font-normal">em três camadas.</GradientText>
        </h2>

        <div className="relative">
          {/* conector horizontal entre os 3 cards */}
          <div
            className="absolute left-[17px] right-2 top-4 z-0 h-px max-[980px]:hidden"
            style={{
              background:
                'linear-gradient(90deg,#3a3f48 0%,#3a3f48 6%,#7a2530 50%,#ff4d54 94%,#ff4d54 100%)',
            }}
          />
          <div className="relative grid grid-cols-3 gap-5 max-[980px]:grid-cols-1">
            {LAYER_CARDS.map((card) => (
              <Card key={card.badge} card={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
