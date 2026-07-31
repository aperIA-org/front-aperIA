import type { PrioritizedAction } from '@/lib/dash/types';

/**
 * Ações priorizadas pela I.A para quebrar a cadeia — ordem de prioridade
 * exatamente como veio da análise, sem reordenar na tela.
 */
export function PrioritizedActions({ actions }: { actions: PrioritizedAction[] }) {
  return (
    <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}>
        <h2 className="text-[16px] font-bold">Ações Priorizadas</h2>
      </div>

      <div style={{ padding: '8px 20px 12px' }}>
        {actions.map((action) => (
          <div
            key={action.priority}
            className="flex gap-3"
            style={{ padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}
          >
            <span
              className="mono grid flex-shrink-0 place-items-center rounded-full text-[11px] font-semibold"
              style={{
                width: 22,
                height: 22,
                background: 'var(--bg-surface-raised)',
                color: 'var(--text-primary)',
              }}
            >
              {action.priority}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="text-[13.5px] font-medium text-fg">{action.action}</div>
              <div className="mt-0.5 text-[12px] text-fg-dim">{action.rationale}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
