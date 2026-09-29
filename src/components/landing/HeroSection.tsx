import { GradientText } from './GradientText';
import { MascotArt } from './MascotArt';

export function HeroSection() {
  return (
    <section
      id="top"
      data-landing-section
      className="relative z-[1] overflow-hidden pt-[88px]"
    >
      <div
        className="relative z-[2] mx-auto grid max-w-[1280px] grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] items-center gap-[52px] px-8 pb-[88px] pt-16 max-[980px]:grid-cols-1 max-[980px]:gap-9"
      >
        <div className="text-left">
          <h1 className="mb-6 max-w-[14ch] font-hero text-[clamp(60px,9vw,132px)] font-normal leading-[0.98] text-ink">
            From Attack
            <br />
            <GradientText strong>to Defense.</GradientText>
          </h1>

          <p className="mb-[34px] max-w-[520px] text-[clamp(17px,1.5vw,20px)] font-bold leading-[1.55] text-ink-body">
            Alertas mostram onde há falhas. Não mostram quais viram invasão. A aperIA
            emula um adversário real, correlaciona as evidências com I.A. e prova o
            caminho completo{'\u00A0'} para você fechá-lo antes que alguém o percorra.
          </p>

          {/* O original envolvia este link num <form onsubmit="return false">
              puramente vestigial — só o anchor importa. */}
          <div className="mb-[22px] flex max-w-[520px] flex-wrap items-stretch gap-3">
            <a
              href="#cadastro"
              className="inline-flex flex-none items-center gap-[9px] rounded-xl bg-brand px-[26px] py-[14px] text-[15.5px] font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5"
              style={{
                boxShadow:
                  '0 0 7px rgba(229,51,59,0.55), 0 14px 34px -14px rgba(229,51,59,0.6)',
              }}
            >
              Solicite uma demonstração →
            </a>
          </div>
        </div>

        <div className="relative flex min-h-[440px] items-center justify-center max-[980px]:min-h-[400px]">
          <MascotArt />
        </div>
      </div>
    </section>
  );
}
