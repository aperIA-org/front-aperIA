'use client';

import { useId } from 'react';
import { GAUGE_C, gaugeBand } from '@/lib/dash/format';
import { CountUp } from './CountUp';

/** Marcas em 25/50/75% do arco (135° → 405°). */
function ticks() {
  return [0.25, 0.5, 0.75].map((f) => {
    const a = ((135 + 270 * f) * Math.PI) / 180;
    const x1 = 60 + 36 * Math.cos(a);
    const y1 = 60 + 36 * Math.sin(a);
    const x2 = 60 + 39 * Math.cos(a);
    const y2 = 60 + 39 * Math.sin(a);
    return (
      <line
        key={f}
        x1={x1.toFixed(1)}
        y1={y1.toFixed(1)}
        x2={x2.toFixed(1)}
        y2={y2.toFixed(1)}
        stroke="#707070"
        strokeWidth="1"
      />
    );
  });
}

/**
 * Gauge grande de risk score (0–1000).
 *
 * O id do gradiente vem de `useId()`, não de `Math.random()` como no
 * protótipo: um id aleatório difere entre servidor e cliente e quebraria a
 * hidratação.
 */
export function RiskGauge({ score }: { score: number }) {
  const gradientId = useId();
  const band = gaugeBand(score);
  const offset = GAUGE_C * (1 - Math.min(score, 1000) / 1000);

  return (
    <div className="flex-shrink-0 text-center" style={{ width: 126 }}>
      <div className="relative mx-auto" style={{ width: 120, height: 112 }}>
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          style={
            score > 700 ? { filter: 'drop-shadow(0 0 6px rgba(239,68,68,.18))' } : undefined
          }
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={band.gradientFrom} />
              <stop offset="100%" stopColor={band.color} />
            </linearGradient>
          </defs>
          <path
            d="M28.89 91.11 A44 44 0 1 1 91.11 91.11"
            style={{ stroke: 'var(--gauge-track)' }}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            className="gauge-arc"
            d="M28.89 91.11 A44 44 0 1 1 91.11 91.11"
            stroke={`url(#${gradientId})`}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${GAUGE_C} 999`}
            strokeDashoffset={offset.toFixed(1)}
          />
          {ticks()}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="mono text-[21px] font-semibold leading-none text-fg"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            <CountUp to={score} />
          </div>
        </div>

        <div className="absolute left-0 right-0 top-1/2 mt-3 text-center">
          <div className="mono text-[9.5px] leading-[1.2] text-fg-dim">de 1000</div>
          <div className="text-[11px] font-semibold leading-[1.2]" style={{ color: band.color }}>
            {band.label}
          </div>
        </div>
      </div>
      <div className="-mt-1.5 text-[11px] uppercase tracking-[0.08em] text-fg-dim">
        Risk Score
      </div>
    </div>
  );
}

/** Versão 16×16 usada em linhas de tabela. */
export function MiniGauge({ score }: { score: number }) {
  const band = gaugeBand(score);
  const C = 28.3;
  const offset = C * (1 - Math.min(score, 1000) / 1000);

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="flex-shrink-0">
      <path
        d="M3.76 12.24 A6 6 0 1 1 12.24 12.24"
        style={{ stroke: 'var(--gauge-track)' }}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M3.76 12.24 A6 6 0 1 1 12.24 12.24"
        stroke={band.color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${C} 99`}
        strokeDashoffset={offset.toFixed(1)}
      />
    </svg>
  );
}
