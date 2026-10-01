'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SCREEN_ROUTES } from '@/lib/dash/dash-routes';
import { scanRanAt, shortSha, timeAgo } from '@/lib/dash/format';
import type { RemediationItem, ScanJob } from '@/lib/dash/types';
import { EmptyState } from './EmptyState';
import { RemediationCard } from './RemediationCard';

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

export function RemediationsScreen({
  remediations,
  scopeJob,
  ok,
  now,
}: {
  remediations: RemediationItem[];
  /** Execução do `?scan=`, quando há escopo — alimenta a faixa de contexto. */
  scopeJob: ScanJob | null;
  /** `false` quando a API não respondeu — estado neutro, não "zero patches". */
  ok: boolean;
  now: number;
}) {
  const searchParams = useSearchParams();
  // O escopo do scan vive na URL (`?scan=s1`), então o link é compartilhável.
  // Quem resolve é o servidor: com dado real ele vira `scan_job_id` na API.
  const scanId = searchParams.get('scan');
  // `?rem=r1` substitui o `window.highlightRem` do protótipo — quem vem de um
  // finding pede o destaque pela URL.
  const highlightParam = searchParams.get('rem');

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

  const ctxRunning = scopeJob
    ? [scopeJob.tier1_status, scopeJob.tier2_status, scopeJob.tier3_status].includes(
        'running',
      )
    : false;

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight">Remediações</h1>
        <p className="mt-1 text-[13px] text-fg-dim">
          Todo patch que o pipeline propôs. Quem aprova e aplica é você, no
          GitHub — aqui estão inclusive os que não couberam num pull request.
        </p>
      </div>

      {/* faixa de contexto quando veio do clique num scan */}
      {scopeJob && (
        <div
          className="stat-card mb-5 flex items-center gap-3"
          style={{ padding: '12px 16px' }}
        >
          <ScanContextIcon />
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Exibindo remediações do scan{' '}
            <b style={{ color: 'var(--text-primary)' }}>{scopeJob.repo_full_name}</b>
            {scopeJob.pr_number ? (
              <>
                {' · '}
                <span className="mono">PR #{scopeJob.pr_number}</span>
              </>
            ) : null}{' '}
            · <span className="mono">{shortSha(scopeJob.commit_sha)}</span> ·{' '}
            {timeAgo(scanRanAt(scopeJob), now)}
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

      {remediations.map((rem) => (
        <RemediationCard
          key={rem.id}
          remediation={rem}
          destino={rem.destino}
          finding={rem.finding}
          job={rem.job}
          highlighted={highlighted === rem.id}
        />
      ))}

      {remediations.length === 0 && (
        <div className="stat-card">
          {!ok ? (
            <EmptyState
              title="Não foi possível carregar as remediações"
              body="O servidor não respondeu. Recarregue a página em instantes — nenhum patch foi perdido."
            />
          ) : scanId ? (
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
          ) : (
            <EmptyState
              title="Nenhuma remediação ainda"
              body="Os patches aparecem aqui depois que um scan encontra um problema de código com arquivo e linha. Vulnerabilidades encontradas na aplicação em execução não geram patch."
              action={
                <Link href={SCREEN_ROUTES.pipelines} className="btn btn-md btn-primary">
                  Ver scans
                </Link>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
