import { PullRequestMock } from './PullRequestMock';

export function PullRequestSection() {
  return (
    <section data-landing-section className="relative z-[1]">
      {/* O original flutuava aqui um <dc-import> que re-renderizava a página
          inteira dentro de si mesma (100%×540px, deslocado left:634px/top:-666px).
          É resíduo da ferramenta de design e não tem equivalente em React. */}
      <div className="mx-auto max-w-[1100px] px-8 py-[132px]">
        <h2 className="apr-rev mb-4 max-w-[720px] text-[clamp(28px,3.2vw,42px)] font-bold leading-[1.1] tracking-[-0.02em] text-accent-bright">
          <span className="font-normal text-ink-strong">
            O resultado no seu repositório. <br />
          </span>
          Com a prova junto.
        </h2>

        <p className="mb-9 max-w-[640px] text-base leading-[1.65] text-ink-strong">
          A remediação chega como Pull Request, com attack path, passos de reprodução
          e diff sugerido. O merge exige aprovação humana.{' '}
          <span className="font-semibold text-brand">
            A aperIA nunca aplica código sozinha.
          </span>
        </p>

        <PullRequestMock />
      </div>
    </section>
  );
}
