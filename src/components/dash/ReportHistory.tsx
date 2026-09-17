'use client';

import Link from 'next/link';
import { useState } from 'react';
import { reportDetailRoute, type ReportOrigin } from '@/lib/dash/dash-routes';
import { fmtAbs, riskColor, riskMax, scanRanAt, shortSha, timeAgo } from '@/lib/dash/format';
import type { ScanJob } from '@/lib/dash/types';
import { MiniGauge } from './RiskGauge';
import { TierStepperCompact } from './TierStepperCompact';

/**
 * As execuções anteriores DESTE commit (`GET /scans/{id}/history`).
 *
 * Só existe porque rescanear a mesma branch deixou de sobrescrever a execução
 * anterior: cada rescan guarda o próprio relatório, risk score e status por
 * tier. Com uma execução só a seção não aparece — a linha seria a própria tela.
 *
 * Em demonstração isto significa outra coisa (os scans do repositório, já que o
 * dataset do protótipo não repete commit), e é a tela que passa a lista certa.
 *
 * **Fechada por padrão, e no fim da tela.** É referência, não a leitura
 * principal: quem abre o relatório quer o impacto, o Tier 3 e os findings desta
 * execução; as anteriores servem para comparar depois. Aberta por padrão, ela
 * empurrava o resto da página para baixo com uma tabela que quase nunca é o
 * motivo da visita. O contador fica no cabeçalho, então fechada ela ainda diz
 * quantas são.
 *
 * O estado é `useState`, nunca `localStorage`: o carrossel do cadastro renderiza
 * esta tela num iframe com `?preview=1` e não pode poluir estado real.
 */
export function ReportHistory({
  job,
  history,
  demo,
  now,
  origem,
  /**
   * Remediações por id de execução — só o protótipo tem esse dado.
   *
   * Um MAPA, não um callback: este componente é cliente (a seção abre e fecha) e
   * quem o renderiza em demonstração é um server component. Função não atravessa
   * essa fronteira — o Next lança "Functions cannot be passed directly to Client
   * Components", e a seção inteira desaparecia da tela.
   */
  remCounts,
}: {
  job: ScanJob;
  history: ScanJob[];
  demo: boolean;
  now: number;
  /** Preservada nos links: trocar de execução não muda de onde o usuário veio. */
  origem?: ReportOrigin;
  remCounts?: Record<string, number>;
}) {
  const [aberta, setAberta] = useState(false);

  if (history.length === 0) return null;

  const titulo = demo ? 'Histórico de scans' : 'Execuções deste commit';

  return (
    <div className="rep-card rep-mb" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        className="hist-hd"
        aria-expanded={aberta}
        onClick={() => setAberta((v) => !v)}
      >
        <span className="hist-hd-b">
          <span className="hist-hd-nm">
            {titulo}{' '}
            <span className="hist-hd-ct">
              {history.length} {history.length === 1 ? 'execução' : 'execuções'}
            </span>
          </span>
          {!demo && (
            <span className="hist-hd-tx">
              Cada rescan da mesma branch guarda o próprio relatório.
            </span>
          )}
        </span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="hist-hd-chev"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {aberta && history.map((j) => {
        const rem = remCounts?.[j.id] ?? 0;
        const current = j.id === job.id;

        return (
          <Link
            key={j.id}
            href={reportDetailRoute(j.id, origem)}
            className="tbl-row sr-row"
            style={{
              gridTemplateColumns: '1fr 130px 110px 24px',
              gap: 16,
              alignItems: 'center',
              ...(current ? { background: 'var(--accent-tint)' } : {}),
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="lnk text-sm font-medium text-fg">
                {/* `pr_number` é 0 em scan manual (roda sem PR). */}
                {j.pr_number > 0 ? `PR #${j.pr_number} ` : 'Execução '}
                <span className="mono text-fg-dim" style={{ fontSize: 11 }}>
                  {shortSha(j.commit_sha)}
                </span>
                {rem ? (
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {' '}
                    · {rem} {rem === 1 ? 'remediação' : 'remediações'}
                  </span>
                ) : null}
              </div>
              <div className="mono mt-0.5" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                <span title={fmtAbs(scanRanAt(j))} className="cursor-help">
                  {timeAgo(scanRanAt(j), now)}
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <TierStepperCompact job={j} />
            </div>

            <div className="flex items-center justify-end gap-1.5">
              {j.final_risk_score ? (
                <>
                  <MiniGauge score={j.final_risk_score} max={riskMax(demo)} />
                  <span
                    className="mono font-bold"
                    style={{ fontSize: 14, color: riskColor(j.final_risk_score, riskMax(demo)) }}
                  >
                    {j.final_risk_score}
                  </span>
                </>
              ) : (
                <span className="mono" style={{ fontSize: 13, color: 'var(--border-mid)' }}>
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
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
