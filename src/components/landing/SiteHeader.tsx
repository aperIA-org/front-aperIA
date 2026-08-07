import Link from 'next/link';
import { Wordmark } from './Wordmark';

const NAV_LINK_CLASS =
  'text-ink-strong transition-colors duration-150 hover:text-[#33353a]';

const BUTTON_BASE =
  'rounded-[7px] px-[18px] py-[9px] text-sm font-semibold transition-all duration-150';

export function SiteHeader() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.08] backdrop-blur-[14px]"
      // color-mix(in srgb, #f2f0e9 78%, transparent) — rgba direto p/ suporte amplo
      style={{ background: 'rgba(242,240,233,0.78)' }}
    >
      <div className="mx-auto flex min-h-[88px] max-w-[1240px] items-center justify-between px-8 py-4">
        <a href="#top" className="flex items-center gap-[11px] outline-offset-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG: o otimizador do next/image não o processa */}
          <img
            src="/assets/mark.svg"
            alt="aperIA"
            className="block h-[46px] w-auto"
            style={{ filter: 'drop-shadow(0 0 11px #e5333b)' }}
          />
          <Wordmark withGlow className="text-[27px] tracking-[0.01em] text-ink" />
        </a>

        <nav className="flex items-center gap-[30px] text-sm text-ink-mute max-[980px]:hidden">
          <a href="#attack-path" className={NAV_LINK_CLASS}>
            Emulação de Ataque
          </a>
          {/* Apontava para #problema, uma section vazia que o port descartou. */}
          <a href="#camadas" className={NAV_LINK_CLASS}>
            Correlação por I.A.
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={`${BUTTON_BASE} border border-black/[0.16] text-[#33353a] hover:bg-black/[0.03]`}
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className={`${BUTTON_BASE} bg-brand text-white hover:-translate-y-px`}
            style={{
              boxShadow:
                '0 0 7px rgba(229,51,59,0.55), 0 8px 24px -8px rgba(229,51,59,0.5)',
            }}
          >
            Cadastrar
          </Link>
        </div>
      </div>
    </header>
  );
}
