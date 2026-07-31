'use client';

import { useDashState } from '@/lib/dash/dash-state';
import { fmtAbs, timeAgo } from '@/lib/dash/format';
import { ROLE_LABELS, TEAM } from '@/lib/dash/mock-data';

/**
 * Tela Time — membros do workspace.
 *
 * A coluna "Última Atividade" só mostra data quando o onboarding foi concluído:
 * antes disso não houve atividade nenhuma para registrar.
 */
export default function TeamPage() {
  const { connected, mounted } = useDashState();

  return (
    <div className="page-wrap">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Time</h1>
          <p className="mt-1 text-[13px] text-fg-dim">
            {TEAM.length} membros · workspace Acme · Pessoal
          </p>
        </div>
        <button type="button" className="btn btn-md btn-primary">
          + Convidar membro
        </button>
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="dtbl">
          <colgroup>
            <col />
            <col style={{ width: 160 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 80 }} />
          </colgroup>
          <thead>
            <tr>
              <th className="cl">Membro</th>
              <th>Perfil</th>
              <th>Última Atividade</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {TEAM.map((member) => (
              <tr key={member.id}>
                <td className="cl">
                  <div className="flex items-center gap-3">
                    <div
                      className="mono grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[11px] font-semibold text-fg"
                      style={{ background: 'var(--gauge-track)' }}
                    >
                      {member.avatar}
                    </div>
                    <div>
                      <div className="text-[13.5px] font-medium">{member.name}</div>
                      <div className="mt-px text-[12px] text-fg-dim">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-[11px] text-fg-mute"
                    style={{
                      background: 'var(--bg-surface-raised)',
                      border: '1px solid var(--divider)',
                    }}
                  >
                    {ROLE_LABELS[member.role]}
                  </span>
                </td>
                <td>
                  {mounted && connected ? (
                    <span
                      className="cursor-help text-[12px] text-fg-dim"
                      title={fmtAbs(member.last_seen)}
                    >
                      {timeAgo(member.last_seen)}
                    </span>
                  ) : (
                    <span className="text-[12px] text-fg-dim">—</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    aria-label={`Ações para ${member.name}`}
                  >
                    ...
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
