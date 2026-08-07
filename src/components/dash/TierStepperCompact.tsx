import { TIER_META } from '@/lib/dash/format';
import type { ScanJob, TierStatus } from '@/lib/dash/types';

const DOT_COLOR: Record<string, string> = {
  done: '#22c55e',
  running: '#3b82f6',
  failed: '#ef4444',
};

const STATUS_PT: Record<string, string> = {
  done: 'concluído',
  running: 'em execução',
  failed: 'falhou',
  skipped: 'pulado',
  queued: 'na fila',
};

function TierDot({ status }: { status: TierStatus }) {
  if (!status) {
    return (
      <span
        className="flex-shrink-0"
        style={{ width: 6, height: 6, boxShadow: 'inset 0 0 0 1px var(--border-strong)' }}
      />
    );
  }
  if (status === 'skipped') {
    return (
      <span
        className="flex-shrink-0"
        style={{ width: 6, height: 6, background: 'var(--border-mid)' }}
      />
    );
  }
  return (
    <span
      className="flex-shrink-0"
      style={{ width: 6, height: 6, background: DOT_COLOR[status] }}
    />
  );
}

/** Três pontos ligados por tracejado — versão compacta do stepper, para linhas de tabela. */
export function TierStepperCompact({ job }: { job: ScanJob }) {
  const statuses: TierStatus[] = [job.tier1_status, job.tier2_status, job.tier3_status];
  const durations = [job.t1_dur, job.t2_dur, job.t3_dur];

  return (
    <div className="flex items-center">
      {statuses.map((status, index) => {
        const meta = TIER_META[index];
        const duration = status === 'done' && durations[index] ? ` em ${durations[index]}` : '';
        const tip = `${meta.name} · ${meta.desc} · ${STATUS_PT[status ?? ''] ?? 'pendente'}${duration}`;
        return (
          <span key={meta.name} className="flex items-center">
            {index > 0 && (
              <span
                className="flex-shrink-0"
                style={{ width: 14, borderTop: '1px dashed var(--border-mid)' }}
              />
            )}
            <span title={tip} className="inline-flex cursor-help">
              <TierDot status={status} />
            </span>
          </span>
        );
      })}
    </div>
  );
}
