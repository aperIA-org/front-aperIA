/** Radar do card de objetivo — acende quando o marcador chega ao último nó. */
function RadarIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="#ff2d3d" strokeWidth="2" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="#ff5a61" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="4" fill="none" stroke="#ff2d3d" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="1.6" fill="#ff2d3d" />
      <line x1="16" y1="1.5" x2="16" y2="6.5" stroke="#ff2d3d" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="25.5" x2="16" y2="30.5" stroke="#ff2d3d" strokeWidth="2" strokeLinecap="round" />
      <line x1="1.5" y1="16" x2="6.5" y2="16" stroke="#ff2d3d" strokeWidth="2" strokeLinecap="round" />
      <line x1="25.5" y1="16" x2="30.5" y2="16" stroke="#ff2d3d" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 23 L15.2 16.8" stroke="#ffd9d9" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M7 25 L9.4 24.4 L8.6 22"
        fill="none"
        stroke="#ffd9d9"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.4 15 L17 16.6 L16 18.2" fill="#ff2d3d" />
    </svg>
  );
}

/**
 * Último nó do trilho: o único card escuro, com um anel de LED girando na borda
 * (conic-gradient + máscara interna) e o radar que acende no fim.
 */
export function AttackPathGoalCard() {
  return (
    <div className="ap-lit ap-pop-goal relative max-w-[352px] flex-1 overflow-hidden rounded-xl bg-[#150d10]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[200%]"
        style={{
          transform: 'translate(-50%,-50%)',
          background:
            'conic-gradient(from 0deg, transparent 0deg, transparent 288deg, rgba(255,90,97,.25) 320deg, rgba(255,45,61,.9) 348deg, #ffd9d9 358deg, #fff 360deg)',
          animation: 'ledSpin 2.6s linear infinite',
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[1.5px] rounded-[11px] bg-[#150d10]"
      />

      <div className="relative flex items-center justify-between gap-3 px-[15px] py-2.5">
        <div className="min-w-0">
          <div className="mb-[5px] text-[10px] font-medium tracking-[0.18em] text-[#ff5a61]">
            ALVO ALCANÇADO
          </div>
          <div className="font-heading text-base font-bold leading-[1.05] text-[#f4f5f7]">
            Objetivo Final
          </div>
          <div className="mt-1.5 text-[10px] leading-[1.55] tracking-[0.015em] text-[#c9b3b5]">
            Domain-admin ·{' '}
            <span className="font-semibold text-[#ff2d3d]">
              Controle total do domínio
            </span>
          </div>
        </div>
        <span className="ap-check inline-flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center">
          <RadarIcon />
        </span>
      </div>
    </div>
  );
}
