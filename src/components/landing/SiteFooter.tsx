import Link from 'next/link';
import { Wordmark } from './Wordmark';

const COLUMN_HEADING_CLASS =
  'mb-4 font-mono text-[11px] font-bold tracking-[0.14em]';
const LINK_STACK_CLASS = 'flex flex-col gap-[11px] text-sm text-ink-mute';

export function SiteFooter() {
  return (
    <footer className="relative z-[1] bg-warm">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 px-8 pb-10 pt-[54px] max-[980px]:grid-cols-2 max-[980px]:gap-8 max-[560px]:grid-cols-1">
        <div>
          {/* 113×110: no original um style inline sobrescrevia os atributos
              width=32/height=35 da tag. Parece involuntário, mas o port mantém
              o tamanho que está no ar hoje. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG: o otimizador do next/image não o processa */}
          <img
            src="/assets/mark.svg"
            alt=""
            aria-hidden="true"
            className="h-[110px] w-[113px] rounded-[5px]"
          />
          <Wordmark className="mt-2 block text-lg tracking-[-0.01em]" />
          <p className="mt-3 max-w-[300px] text-sm leading-[1.6] text-ink-strong">
            A camada de inteligência ofensiva acima dos seus scanners.
          </p>
        </div>

        <div>
          <p className={`${COLUMN_HEADING_CLASS} text-ink-strong`}>PRODUTO</p>
          <div className={LINK_STACK_CLASS}>
            <a href="#camadas" className="hover:text-ink">
              Como funciona
            </a>
          </div>
        </div>

        <div>
          <p className={`${COLUMN_HEADING_CLASS} text-ink`}>TECNOLOGIA</p>
          <div className={LINK_STACK_CLASS}>
            <span>Reasoning Engine</span>
            <span>MITRE Caldera</span>
          </div>
        </div>

        <div>
          <p className={`${COLUMN_HEADING_CLASS} text-ink-strong`}>EMPRESA</p>
          <div className={LINK_STACK_CLASS}>
            <Link href="/cadastro" className="hover:text-ink">
              Cadastrar
            </Link>
            <span>Documentação</span>
            <span>Contato</span>
          </div>
        </div>
      </div>

      {/* text-ink-graf (#3A2E2A) em vez de #767c88: o script de "legibility
          repair" do site antigo reescrevia esta cor em runtime. */}
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-3 border-t border-black/[0.06] px-8 pb-10 pt-5 font-mono text-[11.5px] text-ink-graf">
        <span className="font-bold">© 2026 aperIA ·</span>
      </div>
    </footer>
  );
}
