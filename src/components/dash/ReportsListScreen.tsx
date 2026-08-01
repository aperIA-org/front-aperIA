'use client';

import Link from 'next/link';
import { reportDetailRoute, SCREEN_ROUTES } from '@/lib/dash/dash-routes';
import { fmtAbs, riskColor, shortSha, timeAgo } from '@/lib/dash/format';
import type { ScanJob } from '@/lib/dash/types';
import { EmptyState } from './EmptyState';
import { MiniGauge } from './RiskGauge';
import { TierStepperCompact } from './TierStepperCompact';

/**
 * Histórico de execuções do pipeline.
 *
 * As execuções chegam por prop (`GET /scans` no server component, ou o dataset
 * do protótipo em demonstração) — a tela não sabe de onde vêm.
 */
export function ReportsListScreen({
  jobs,
  ok,
  now,
}: {
  jobs: ScanJob[];
  /** `false` = a API não respondeu. Diferente de "nenhuma execução". */
  ok: boolean;
  /** Âncora de tempo do server component: `REF_NOW` em demo, agora real na API. */
  now: number;
}) {
  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold">Relatórios de Scans</h1>
        <p className="mt-1 text-[13px] text-fg-dim">
          Histórico de execuções · {jobs.length}{' '}
          {jobs.length === 1 ? 'relatório' : 'relatórios'}
        </p>
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-[16px] font-bold">Execuções</h2>
        </div>

        <div>
          {!ok ? (
            <div style={{ padding: 32 }}>
              <EmptyState
                title="Não foi possível carregar os relatórios"
                body="O aperIA não conseguiu falar com a API. Recarregue a página; se persistir, verifique se sua sessão ainda é válida."
              />
            </div>
          ) : jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <h3 className="mb-2 text-[15px] font-semibold">Nenhum relatório ainda</h3>
              <p className="mx-auto mb-5 max-w-[52ch] text-[13px] leading-[1.6] text-fg-mute">
                Cada pull request nos repositórios monitorados dispara o scan de 3 tiers e
                gera um relatório. Você também pode iniciar um scan manual na aba Scans.
              </p>
              <Link href={SCREEN_ROUTES.integrations} className="btn btn-md btn-primary">
                Ir para Repositórios
              </Link>
            </div>
          ) : (
            jobs.map((job) => {
              // Faixa de cor à esquerda: verde/âmbar/vermelho pelo risk score.
              const band = job.final_risk_score
                ? riskColor(job.final_risk_score)
                : 'var(--divider)';
              const running = [
                job.tier1_status,
                job.tier2_status,
                job.tier3_status,
              ].includes('running');

              return (
                <Link
                  key={job.id}
                  href={reportDetailRoute(job.id)}
                  className="tbl-row sr-row"
                  style={{
                    gridTemplateColumns: '14px 1fr 130px 110px 24px',
                    gap: 16,
                    alignItems: 'center',
                  }}
                >
                  <span
                    className="flex-shrink-0 rounded-full"
                    style={{ width: 7, height: 7, background: band }}
                  />

                  <div style={{ minWidth: 0 }}>
                    <div className="lnk text-sm font-medium text-fg">
                      {job.repo_full_name}{' '}
                      {/* Scan manual roda sem PR — `#0` seria um número inventado. */}
                      {job.pr_number > 0 && (
                        <span className="mono text-fg-dim" style={{ fontSize: 12 }}>
                          #{job.pr_number}
                        </span>
                      )}
                    </div>
                    <div
                      className="mono mt-0.5"
                      style={{ fontSize: 11, color: 'var(--text-faint)' }}
                    >
                      {shortSha(job.commit_sha)} ·{' '}
                      <span title={fmtAbs(job.created_at)} className="cursor-help">
                        {timeAgo(job.created_at, now)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <TierStepperCompact job={job} />
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    {job.final_risk_score ? (
                      <>
                        <MiniGauge score={job.final_risk_score} />
                        <span
                          className="mono font-bold"
                          style={{
                            fontSize: 15,
                            fontVariantNumeric: 'tabular-nums',
                            color: riskColor(job.final_risk_score),
                          }}
                        >
                          {job.final_risk_score}
                        </span>
                      </>
                    ) : running ? (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        em análise…
                      </span>
                    ) : (
                      <span className="mono" style={{ fontSize: 14, color: 'var(--border-mid)' }}>
                        –
                      </span>
                    )}
                  </div>

                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="text-fg-dim"
                    style={{ justifySelf: 'end' }}
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
