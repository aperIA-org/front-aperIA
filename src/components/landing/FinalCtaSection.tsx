import { GradientText } from './GradientText';

/**
 * CTA final.
 *
 * O formulário é um GET nativo de propósito: o browser navega para
 * /cadastro?email=… e a página de cadastro pré-preenche o campo. Sem handler,
 * sem JS — por isso este componente continua sendo server component.
 */
export function FinalCtaSection() {
  return (
    <section
      id="cadastro"
      data-landing-section
      className="relative z-[1] overflow-hidden"
    >
      <div className="relative mx-auto max-w-[760px] px-8 pb-[110px] pt-[120px] text-center">
        <h2 className="apr-rev mb-5 text-[clamp(32px,4.4vw,56px)] font-bold leading-[1.06] tracking-[-0.025em]">
          <span className="font-normal">
            Pare de priorizar{'\u00A0'}por CVSS.
            <br />
          </span>
          Priorize por <GradientText>evidência</GradientText>.
        </h2>

        <form
          action="/cadastro"
          method="get"
          className="mx-auto flex max-w-[480px] flex-wrap justify-center gap-2.5"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="seu@email.com"
            aria-label="Seu e-mail"
            className="min-w-[220px] flex-1 rounded-[10px] border border-black/[0.14] bg-white/[0.03] px-[18px] py-[15px] font-mono text-sm text-[#33353a] outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-[10px] border-none bg-brand px-7 py-[15px] font-heading text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hov"
            style={{
              boxShadow:
                '0 0 7px rgba(229,51,59,0.55), 0 12px 30px -12px rgba(229,51,59,0.55)',
            }}
          >
            Criar conta e acessar →
          </button>
        </form>
      </div>
    </section>
  );
}
