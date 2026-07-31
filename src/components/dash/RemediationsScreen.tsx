'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SCREEN_ROUTES } from '@/lib/dash/dash-routes';
import { shortSha, timeAgo } from '@/lib/dash/format';
import { FINDINGS, REMEDIATIONS, SCAN_JOBS } from '@/lib/dash/mock-data';
import type { RemediationStatus } from '@/lib/dash/types';
import { DemoDataBadge } from './DemoDataBadge';
import { EmptyState } from './EmptyState';
import { RemediationCard } from './RemediationCard';

/** Revisor simulado — o protótipo assinava toda aprovação com este e-mail. */
const REVIEWER = 'marina.alves@acme.io';

type Decision = { status: RemediationStatus; approvedBy: string };

function ScanContextIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="flex-shrink-0 text-fg-dim"
      aria-hidden="true"
    >
      <path d="M3 7V5a2 2 0 012-2h2" />
      <path d="M17 3h2a2 2 0 012 2v2" />
      <path d="M21 17v2a2 2 0 01-2 2h-2" />
      <path d="M7 21H5a2 2 0 01-2-2v-2" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function RemediationsScreen() {
  const searchParams = useSearchParams();
  // `remScanContext` era estado de módulo no protótipo; aqui o escopo do scan
  // vive na URL (`?scan=s1`), então o link continua compartilhável.
  const scanId = searchParams.get('scan');
  // `?rem=r1` substitui o `window.highlightRem` — quem vem de um finding pede
  // o destaque pela URL.
  const highlightParam = searchParams.get('rem');

  /**
   * Aprovar/rejeitar NÃO muta `REMEDIATIONS`: o array é módulo compartilhado e
   * mutá-lo (como o protótipo fazia) deixaria a decisão gravada para todas as
   * telas até o próximo reload. As decisões desta sessão ficam aqui, por id.
   */
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightParam) return;
    const el = document.getElementById(`rem-${highlightParam}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    setHighlighted(highlightParam);
    const timer = setTimeout(() => setHighlighted(null), 1600);
    return () => clearTimeout(timer);
  }, [highlightParam]);

  const decide = (id: string, status: RemediationStatus) => {
    setDecisions((prev) => ({ ...prev, [id]: { status, approvedBy: REVIEWER } }));
  };

  const ctxJob = scanId ? SCAN_JOBS.find((j) => j.id === scanId) : undefined;
  const remList = ctxJob
    ? REMEDIATIONS.filter((r) => r.scan_job_id === ctxJob.id)
    : REMEDIATIONS;

  const ctxRunning = ctxJob
    ? [ctxJob.tier1_status, ctxJob.tier2_status, ctxJob.tier3_status].includes('running')
    : false;

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-[24px] font-bold tracking-tight">Remediações</h1>
          <DemoDataBadge className="flex-shrink-0" />
        </div>
        <p className="mt-1 text-[13px] text-fg-dim">
          Patches sugeridos, aguardando aprovação humana antes de aplicar
        </p>
      </div>

      {/* faixa de contexto quando veio do clique num scan */}
      {ctxJob && (
        <div
          className="stat-card mb-5 flex items-center gap-3"
          style={{ padding: '12px 16px' }}
        >
          <ScanContextIcon />
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Exibindo remediações do scan{' '}
            <b style={{ color: 'var(--text-primary)' }}>{ctxJob.repo_full_name}</b> ·{' '}
            <span className="mono">PR #{ctxJob.pr_number}</span> ·{' '}
            <span className="mono">{shortSha(ctxJob.commit_sha)}</span> ·{' '}
            {timeAgo(ctxJob.created_at)}
          </span>
          <Link
            href={SCREEN_ROUTES.remediations}
            className="chip chip-clear"
            style={{ marginLeft: 'auto' }}
          >
            Ver todas ×
          </Link>
        </div>
      )}

      {remList.map((rem) => {
        const decision = decisions[rem.id];
        return (
          <RemediationCard
            key={rem.id}
            remediation={rem}
            status={decision?.status ?? rem.status}
            approvedBy={decision?.approvedBy ?? rem.approved_by}
            finding={FINDINGS.find((f) => f.id === rem.finding_id)}
            job={SCAN_JOBS.find((j) => j.id === rem.scan_job_id)}
            highlighted={highlighted === rem.id}
            onApprove={() => decide(rem.id, 'approved')}
            onReject={() => decide(rem.id, 'rejected')}
          />
        );
      })}

      {ctxJob && remList.length === 0 && (
        <div className="stat-card">
          <EmptyState
            title="Nenhuma remediação para este scan"
            body={
              ctxRunning
                ? 'Este scan ainda está em execução. As remediações aparecem aqui assim que a análise terminar.'
                : 'Este scan não gerou patches de remediação. Isso acontece quando nenhum finding acionável foi encontrado ou o scan foi bloqueado antes da análise.'
            }
            action={
              <Link href={SCREEN_ROUTES.remediations} className="btn btn-md btn-primary">
                Ver todas as remediações
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
