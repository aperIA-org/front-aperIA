'use client';

import { CHART_SEV } from '@/lib/dash/format';
import { CountUp } from './CountUp';

const R = 42;
const STROKE = 14;
const CIRC = 2 * Math.PI * R;
const CX = 60;
const CY = 60;
const GAP_DEG = 2;
const GAP_ARC = (CIRC * GAP_DEG) / 360;

export type DonutEntry = { key: string; n: number; color: string };

/**
 * Donut de contagens. Geometria idêntica ao protótipo (r=42, stroke=14, gap de
 * 2°); a diferença é que os segmentos já são renderizados no tamanho final em
 * vez de animarem de zero via JS.
 */
export function Donut({
  entries,
  total,
  centerLabel = 'TOTAL',
  size = 184,
}: {
  entries: DonutEntry[];
  total: number;
  centerLabel?: string;
  size?: number;
}) {
  let acc = 0;
  const segments = entries
    .filter((e) => e.n > 0)
    .map((entry) => {
      const frac = total > 0 ? entry.n / total : 0;
      const drawLen = Math.max(frac * CIRC - GAP_ARC, 0.5);
      const startDeg = (acc / (total || 1)) * 360 - 90 + GAP_DEG / 2;
      acc += entry.n;
      return (
        <circle
          key={entry.key}
          className="dn-seg"
          data-key={entry.key}
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={entry.color}
          strokeWidth={STROKE}
          strokeLinecap="butt"
          strokeDasharray={`${drawLen.toFixed(2)} ${CIRC.toFixed(2)}`}
          transform={`rotate(${startDeg.toFixed(2)} ${CX} ${CY})`}
        />
      );
    });

  const digits = String(total).length;
  const numSize = digits <= 2 ? 32 : digits === 3 ? 28 : 24;

  return (
    <div className="dn-wrap relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" data-donut>
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          style={{ stroke: 'var(--chart-track)' }}
          strokeWidth={STROKE}
        />
        {segments}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="mono font-bold leading-none text-fg"
          style={{ fontSize: numSize, fontVariantNumeric: 'tabular-nums' }}
        >
          <CountUp to={total} />
        </div>
        <div className="mono mt-[3px] text-[9px] tracking-[0.14em] text-fg-dim">
          {centerLabel}
        </div>
      </div>
    </div>
  );
}

export type SevCounts = Record<'critical' | 'high' | 'medium' | 'low' | 'info', number>;

export function SevDonut({ counts, total }: { counts: SevCounts; total: number }) {
  const entries: DonutEntry[] = (
    Object.keys(counts) as (keyof SevCounts)[]
  ).map((key) => ({ key, n: counts[key], color: CHART_SEV[key] }));

  return <Donut entries={entries} total={total} />;
}
