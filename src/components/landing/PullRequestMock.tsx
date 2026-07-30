'use client';

import { PR_CHECKS } from '@/lib/landing/pr-checks';
import { useAttackPathModal } from './AttackPathModalContext';

const BLOCK_BORDER = 'border-b border-paper-line';

function AlertTriangleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/**
 * Mock de um Pull Request no GitHub.
 *
 * Os valores de chrome (borda #d0d7de, raio 6px, sombra discreta) são os da
 * camada de override, que substituía o card mais "arredondado" do markup
 * original por algo visualmente fiel ao GitHub.
 */
export function PullRequestMock() {
  const { open } = useAttackPathModal();

  return (
    <div className="apr-rev overflow-hidden rounded-md border border-[#d0d7de] bg-white font-body text-ink-mute shadow-[0_1px_3px_rgba(27,31,36,0.08)]">
      {/* título */}
      <div className={`${BLOCK_BORDER} px-5 pb-[14px] pt-[18px]`}>
        <div className="text-[21px] font-semibold text-ink">
          Remediar attack path validado: web-edge → domain-admin{' '}
          <span className="font-normal text-ink-soft">#142</span>
        </div>
        <div className="mt-1 text-[13.5px] text-ink-soft">
          <span className="font-semibold text-ink">aperIA-bot</span> quer fazer merge
          de <span className="font-semibold text-ink">1 commit</span> em{' '}
          <span className="font-mono text-sev-info">main</span> a partir de{' '}
          <span className="font-mono text-sev-info">fix/attack-path-142</span>
        </div>
      </div>

      {/* abas */}
      <div className={`${BLOCK_BORDER} flex items-center gap-4 px-2 text-[13.5px]`}>
        <span className="px-2 py-2.5">Conversation</span>
        <span className="flex items-center gap-1.5 px-2 py-2.5">
          Commits
          <span className="rounded-full bg-paper-line px-[7px] py-px text-[11px] text-ink-mute">
            1
          </span>
        </span>
        <span className="flex items-center gap-1.5 border-b-2 border-[#f78166] px-2 py-2.5 font-semibold text-ink">
          Checks
          <span className="rounded-full bg-sev-safe px-[7px] py-px text-[11px] text-white">
            3
          </span>
        </span>
      </div>

      {/* comentário do bot */}
      <div className={`${BLOCK_BORDER} px-5 py-[18px]`}>
        <div className="mb-3 flex items-center gap-2">
          {/* 119×83: um style inline sobrescrevia os atributos 30×33 da tag e
              distorcia o avatar. Parece involuntário, mas o port mantém o que
              está no ar hoje. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG: o otimizador do next/image não o processa */}
          <img
            src="/assets/mark.svg"
            alt=""
            aria-hidden="true"
            className="h-[83px] w-[119px] rounded-md border border-paper-line"
          />
          <span className="text-[13.5px]">
            <span className="font-semibold text-ink">aperIA-bot</span>{' '}
            <span className="text-ink-soft">comentou agora:</span>
          </span>
        </div>

        <div className="rounded-lg border border-paper-line">
          <div className="p-4 text-sm leading-[1.65] text-ink-mute">
            Caminho de ataque{' '}
            <strong className="text-ink">confirmado por emulação de adversário</strong>
            . 5 hops, do edge ao{' '}
            <span className="font-mono text-sev-high">domain-admin</span>. Risco
            ponderado <strong className="text-ink">94/100</strong>.
            <div className="mt-4 flex flex-wrap items-center gap-[14px]">
              <span className="rounded-full border border-paper-line bg-[#f3f2ee] px-3 py-[5px] font-mono text-xs">
                rota web-edge <span className="text-sev-high">→</span> domain-admin · 5
                hops
              </span>
              <button
                type="button"
                onClick={open}
                className="cursor-pointer rounded-[7px] border border-[rgba(255,77,84,0.5)] bg-accent px-[15px] py-2 text-[13.5px] font-semibold text-white"
                style={{
                  boxShadow:
                    '0 0 0 1px rgba(255,77,84,0.25), 0 10px 26px -12px rgba(229,51,59,0.8)',
                }}
              >
                Ver caminho completo →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* checks */}
      <div className={`${BLOCK_BORDER} px-5 py-4`}>
        <div className="mb-3 text-[13px]">
          <b className="text-ink-strong">Todos os checks passaram</b>
        </div>
        <div className="flex flex-col gap-2.5 text-[13.5px]">
          {PR_CHECKS.map((check) => (
            <div key={check.name} className="flex items-center gap-2.5">
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-sev-safe text-[11px] text-white">
                ✓
              </span>
              <span className="font-mono text-ink-mute">{check.name}</span>
              <span className="text-ink-strong">{check.result}</span>
            </div>
          ))}
        </div>
      </div>

      {/* merge bloqueado */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-[18px]">
        <span className="inline-flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full bg-[#FF000A] text-white">
          <AlertTriangleIcon />
        </span>
        <div className="min-w-[200px] flex-1">
          <div className="text-sm font-semibold text-ink">
            Merge bloqueado · aguardando aprovação humana
          </div>
          <div className="text-[13px] text-accent-bright">
            A sugestão precisa ser revisada e aprovada por um desenvolvedor.
          </div>
        </div>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-md border border-[rgba(63,174,106,0.4)] bg-[#238636] px-[18px] py-[9px] text-sm font-semibold text-white opacity-65"
        >
          Confirm merge
        </button>
      </div>
    </div>
  );
}
