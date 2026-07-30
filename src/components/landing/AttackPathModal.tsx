'use client';

import { useEffect, useRef } from 'react';
import { MODAL_DIFF, MODAL_GOAL, MODAL_HOPS } from '@/lib/landing/modal-hops';
import { useAttackPathModal } from './AttackPathModalContext';

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function AttackPathModal() {
  const { isOpen, close } = useAttackPathModal();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  /**
   * Focus trap + devolução do foco — o modal original não tinha nenhum dos
   * dois: era possível tabular para trás da cortina e, ao fechar, o foco
   * voltava para o topo do documento.
   */
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      data-apm-ov
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Attack path 142"
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto px-5 pb-10 pt-[6vh] font-body"
      style={{
        background: 'rgba(4,5,8,0.74)',
        backdropFilter: 'blur(6px)',
        animation: 'apmOv .16s ease both',
      }}
    >
      <div
        data-apm-panel
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[640px] overflow-hidden rounded-[14px] border border-[#2e323a] bg-[#12151b]"
        style={{
          boxShadow: '0 40px 120px -30px rgba(0,0,0,0.95)',
          animation: 'apmPop .19s cubic-bezier(.2,.8,.3,1) both',
        }}
      >
        {/* ── header ── */}
        <div className="flex items-start justify-between gap-4 border-b border-[#2e323a] px-[22px] pb-4 pt-5">
          <div>
            <div className="mb-[7px] flex items-center gap-[9px] font-mono text-[10.5px] tracking-[0.16em] text-accent-soft">
              <span
                className="h-[7px] w-[7px] rounded-full bg-accent-bright"
                style={{ boxShadow: '0 0 9px #ff4d54' }}
              />
              CAMINHO CONFIRMADO POR EMULAÇÃO
            </div>
            <div className="text-[19px] font-bold tracking-[-0.01em] text-[#f4f5f7]">
              Attack path <span className="font-medium text-ink-soft">#142</span>
            </div>
            <div className="mt-[5px] font-mono text-xs text-[#aeb3bd]">
              web-edge <span className="text-sev-high">→</span> domain-admin · risco{' '}
              <strong className="text-white">94/100</strong>
            </div>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={close}
            aria-label="Fechar"
            className="inline-flex h-[34px] w-[34px] flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#2e323a] bg-[#1f2228] text-lg leading-none text-[#aeb3bd] transition-colors duration-150 hover:bg-[#2a2e36] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* ── corpo · timeline vertical ── */}
        <div className="px-6 pb-1.5 pt-[22px]">
          {MODAL_HOPS.map((hop, index) => (
            <div
              key={hop.title}
              data-hop
              className="flex gap-4"
              style={{
                animation: 'apmHop .4s ease both',
                animationDelay: `${index * 60}ms`,
              }}
            >
              <div className="flex w-[26px] flex-shrink-0 flex-col items-center">
                <span
                  className="h-[13px] w-[13px] rounded-full border-2"
                  style={{
                    background: hop.dot,
                    borderColor: hop.dotBorder,
                    boxShadow: hop.dotShadow,
                  }}
                />
                <span
                  className="w-0.5 flex-1"
                  style={{
                    background: hop.connector,
                    minHeight: hop.connectorMinHeight,
                  }}
                />
              </div>
              <div className="min-w-0 pb-[22px]">
                <div className="text-[15px] font-bold leading-[1.25] text-[#f4f5f7]">
                  {hop.title}
                </div>
                <div className="mt-1 font-mono text-[11.5px] text-ink-soft">
                  {hop.meta}
                </div>
                <div className="mt-[5px] font-mono text-[11px] text-accent-soft">
                  {hop.gain}
                </div>
              </div>
            </div>
          ))}

          {/* hop 5 · objetivo alcançado */}
          <div
            data-hop
            className="flex gap-4"
            style={{ animation: 'apmHop .45s ease both', animationDelay: '240ms' }}
          >
            <div className="flex w-[26px] flex-shrink-0 flex-col items-center">
              <span
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-accent-bright"
                style={{
                  background: 'radial-gradient(circle at 50% 40%,#ff5a61,#c11f2b)',
                  boxShadow: '0 0 20px -2px #ff4d54',
                }}
              >
                <span className="h-2 w-2 rounded-full bg-white" />
              </span>
            </div>
            <div
              className="min-w-0 flex-1 rounded-[14px] border-[1.5px] border-accent-bright px-[18px] py-4"
              style={{
                background: 'linear-gradient(135deg,#c11f2b,#e5333b 55%,#8f1822)',
                boxShadow: '0 0 44px -12px #ff4d54',
              }}
            >
              <div className="font-mono text-[10px] tracking-[0.18em] text-[#ffd9d9]">
                {MODAL_GOAL.eyebrow}
              </div>
              <div className="text-[19px] font-extrabold text-white">
                {MODAL_GOAL.title}
              </div>
              <div className="font-mono text-[11.5px] text-white opacity-[0.92]">
                {MODAL_GOAL.meta}
              </div>
            </div>
          </div>
        </div>

        {/* ── rodapé · correção sugerida ── */}
        <div className="mt-2 border-t border-[#2e323a] px-6 pb-[22px] pt-4">
          <div className="mb-3 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG: o otimizador do next/image não o processa */}
            <img src="/assets/mark.svg" alt="" aria-hidden="true" className="h-[18px] w-[18px] rounded" />
            <span className="text-[12.5px] font-semibold text-[#f4f5f7]">
              Correção sugerida pela aperIA
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#2e323a] font-mono text-[12.5px]">
            <div className="border-b border-[#2e323a] bg-[#1f2228] px-4 py-1.5 text-[#f4f5f7]">
              {MODAL_DIFF.file}
            </div>
            <div className="flex bg-[rgba(255,106,61,0.15)]">
              <span className="w-[30px] flex-shrink-0 text-center text-ink-soft">-</span>
              <span
                className="text-[#ffa198] line-through"
                style={{ textDecorationColor: 'rgba(255,161,152,0.5)' }}
              >
                {MODAL_DIFF.removed}
              </span>
            </div>
            <div className="flex bg-[rgba(46,160,67,0.15)]">
              <span className="w-[30px] flex-shrink-0 text-center text-ink-soft">+</span>
              <span className="text-sev-safe">{MODAL_DIFF.added}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
