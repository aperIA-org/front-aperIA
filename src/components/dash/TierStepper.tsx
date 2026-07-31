import { TIER_META } from '@/lib/dash/format';
import type { ScanJob, TierStatus } from '@/lib/dash/types';

/**
 * Stepper completo dos 3 tiers do pipeline — porte de `tierStepper`/`tierStage`/
 * `tierGate` do protótipo (`legacy/dash/index.html`, ~linhas 813–847).
 *
 * A versão compacta (3 pontos) é `TierStepperCompact`, usada em linhas de
 * tabela; esta é a versão instrumentada, com nome do tier, duração, SLA e os
 * dois gates entre os estágios.
 *
 * As animações (`node-ring`, `node-pulse`, `spin-15`, `conn-flow`) vêm do
 * dash.css — nada aqui é estado, então o componente serve tanto para server
 * quanto para client components.
 */

/** Ícone do nó: um estado visual por status do tier. */
function TierIcon({ status }: { status: TierStatus }) {
  if (status === 'done') {
    return (
      <span
        className="relative grid flex-shrink-0 place-items-center"
        style={{ width: 20, height: 20 }}
      >
        <span
          className="node-ring absolute rounded-full"
          style={{ inset: -4, border: '1.5px solid rgba(34,197,94,.4)' }}
        />
        <span
          className="grid place-items-center rounded-full"
          style={{
            width: 20,
            height: 20,
            background: 'rgba(34,197,94,.12)',
            border: '1.5px solid #22c55e',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12.5l5 5L20 7" />
          </svg>
        </span>
      </span>
    );
  }

  if (status === 'running') {
    return (
      <span className="relative flex-shrink-0" style={{ width: 20, height: 20 }}>
        <span
          className="node-pulse absolute rounded-full"
          style={{ inset: 3, background: '#3b82f6' }}
        />
        <svg
          className="spin-15 absolute"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          style={{ inset: 0 }}
        >
          <circle cx="10" cy="10" r="9" stroke="rgba(59,130,246,.25)" strokeWidth="1.5" />
          <path
            d="M10 1a9 9 0 016.36 2.64"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span
        className="relative grid flex-shrink-0 place-items-center"
        style={{ width: 20, height: 20 }}
      >
        <span
          className="absolute rounded-full"
          style={{ inset: -4, border: '1.5px solid rgba(239,68,68,.3)' }}
        />
        <span
          className="grid place-items-center rounded-full"
          style={{
            width: 20,
            height: 20,
            background: 'rgba(239,68,68,.12)',
            border: '1.5px solid rgba(239,68,68,.5)',
          }}
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </span>
      </span>
    );
  }

  if (status === 'skipped') {
    return (
      <span
        className="grid flex-shrink-0 place-items-center rounded-full"
        style={{ width: 20, height: 20, border: '1px solid var(--border-strong)' }}
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#707070"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M5 12h14" />
        </svg>
      </span>
    );
  }

  // Pendente: círculo tracejado.
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
      <circle cx="10" cy="10" r="9" stroke="#4a4b4d" strokeWidth="1.2" strokeDasharray="3 3" />
    </svg>
  );
}

/** Um estágio: ícone + nome/descrição + duração e SLA. */
export function TierStage({
  index,
  status,
  duration,
}: {
  index: number;
  status: TierStatus;
  duration: string | null;
}) {
  const meta = TIER_META[index];
  const on = !!status && status !== 'skipped';

  return (
    <div
      className="flex flex-shrink-0 cursor-help items-center gap-2"
      title={`${meta.name}, ${meta.scanners}`}
    >
      <TierIcon status={status} />
      <div>
        <div
          className="whitespace-nowrap text-[12px] font-semibold leading-[1.2]"
          style={{ color: on ? 'var(--text-primary)' : 'var(--text-dim)' }}
        >
          {meta.name} · {meta.desc}
        </div>
        <div
          className="mono whitespace-nowrap text-[10px] leading-[1.5]"
          style={{ color: 'var(--text-dim)' }}
        >
          {duration ? `${duration} · ` : ''}
          {meta.sla}
        </div>
      </div>
    </div>
  );
}

const GATE_RULES: Record<1 | 2, string> = {
  1: 'secret verificado bloqueia o scan',
  2: 'só low/info finaliza sem Tier 3',
};

/**
 * Gate entre dois tiers: linha + losango.
 *
 * `flow` (linha animada) só aparece quando o tier anterior terminou e o
 * seguinte está rodando — é o que dá a sensação de fluxo no pipeline.
 */
function TierGate({ gate, job }: { gate: 1 | 2; job: ScanJob }) {
  const prev = gate === 1 ? job.tier1_status : job.tier2_status;
  const next = gate === 1 ? job.tier2_status : job.tier3_status;
  const blocked = job.blocked_at_tier === gate;
  const passed = !blocked && prev === 'done' && !!next;

  const seg =
    prev === 'done' && next === 'running'
      ? 'flow'
      : prev === 'done' && next
        ? 'solid'
        : 'idle';

  const lineStyle =
    seg === 'solid'
      ? { background: 'rgba(34,197,94,.5)' }
      : seg === 'flow'
        ? undefined
        : { background: 'var(--gauge-track)' };
  const lineClass = seg === 'flow' ? 'conn-flow' : undefined;

  const diamondBg = blocked ? '#ef4444' : passed ? 'rgba(34,197,94,.6)' : 'var(--bg-surface)';
  const diamondBorder = blocked
    ? '#ef4444'
    : passed
      ? 'rgba(34,197,94,.6)'
      : 'var(--border-strong)';

  const rule = GATE_RULES[gate];
  const tip = blocked
    ? `Gate ${gate} · Bloqueado, ${rule}`
    : passed
      ? `Gate ${gate} · Aprovado, ${gate === 1 ? 'sem secrets verificados' : 'análise profunda liberada'}`
      : `Gate ${gate} · ${rule}`;

  return (
    <div className="flex flex-1 items-center" style={{ minWidth: 20 }} title={tip}>
      <div className={lineClass} style={{ flex: 1, height: 1.5, ...lineStyle }} />
      <div
        className="flex-shrink-0 cursor-help"
        style={{
          width: 9,
          height: 9,
          transform: 'rotate(45deg)',
          background: diamondBg,
          border: `1.5px solid ${diamondBorder}`,
          margin: '0 3px',
        }}
      />
      <div className={lineClass} style={{ flex: 1, height: 1.5, ...lineStyle }} />
    </div>
  );
}

export function TierStepper({ job }: { job: ScanJob }) {
  return (
    <div className="flex items-center gap-2.5">
      <TierStage index={0} status={job.tier1_status} duration={job.t1_dur} />
      <TierGate gate={1} job={job} />
      <TierStage index={1} status={job.tier2_status} duration={job.t2_dur} />
      <TierGate gate={2} job={job} />
      <TierStage index={2} status={job.tier3_status} duration={job.t3_dur} />
    </div>
  );
}
