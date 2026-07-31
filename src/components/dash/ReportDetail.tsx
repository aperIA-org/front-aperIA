'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { reportDetailRoute, SCREEN_ROUTES, findingRoute } from '@/lib/dash/dash-routes';
import { fmtAbs, riskColor, shortSha, timeAgo } from '@/lib/dash/format';
import {
  ASSETS,
  FINDINGS,
  GH_ORG,
  REMEDIATIONS,
  SCAN_JOBS,
} from '@/lib/dash/mock-data';
import { EmptyState } from './EmptyState';
import { DiffView } from './DiffView';
import { MiniGauge } from './RiskGauge';
import { SevBadge } from './SevBadge';
import { TierStepper } from './TierStepper';
import { TierStepperCompact } from './TierStepperCompact';

/** Máximo de findings listados na tabela — o resto fica na tela de Findings. */
const MAX_FINDING_ROWS = 30;

/** Ícone de pull request (mesmo traçado do protótipo). */
function IconPullRequest() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="text-fg-dim"
    >
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5v7M18 15.5V11a4 4 0 00-4-4h-3" />
      <path d="M13.5 4.5L11 7l2.5 2.5" />
    </svg>
  );
}


/**
 * Detalhe de uma execução: o PR enviado com os patches, o histórico de scans do
 * repositório e os findings encontrados pós-scan.
 *
 * Porte de `renderReportDetail` (`legacy/dash/index.html`, linhas 2299–2385).
 * O `id` já foi validado na rota, então aqui a busca em `SCAN_JOBS` nunca falha
 * — o `return null` é só o estreitamento de tipo.
 */
export function ReportDetail({ jobId }: { jobId: string }) {
  const router = useRouter();

  const job = SCAN_JOBS.find((j) => j.id === jobId);
  if (!job) return null;

  const name = job.repo_full_name.split('/')[1];
  const asset = ASSETS.find((a) => a.name === name);
  const assetType = asset?.type ?? 'repository';

  const jobs = SCAN_JOBS.filter((j) => j.repo_full_name === `${GH_ORG}/${name}`).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const assetFindings = FINDINGS.filter((f) => f.asset === name);
  const openFindingsCount = assetFindings.filter((f) => f.status !== 'resolved').length;

  /* PR enviado: o desta execução — existe só se a execução gerou patches. */
  const prRems = REMEDIATIONS.filter((r) => r.scan_job_id === job.id);
  const running = [job.tier1_status, job.tier2_status, job.tier3_status].includes('running');

  return (
    <div className="page-wrap">
      <Link
        href={SCREEN_ROUTES.reports}
        className="btn btn-sm btn-ghost mb-4"
        style={{ gap: 6 }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Relatórios
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">
            {GH_ORG}/{name}
          </h1>
          <p className="mt-1 text-[13px] text-fg-dim">
            {jobs.length} {jobs.length === 1 ? 'scan' : 'scans'} · {openFindingsCount}{' '}
            {openFindingsCount === 1 ? 'finding aberto' : 'findings abertos'}
            {asset?.criticality ? ` · criticidade ${asset.criticality}` : ''}
          </p>
        </div>
        {job.final_risk_score ? (
          <div className="flex items-center gap-2">
            <MiniGauge score={job.final_risk_score} />
            <span
              className="mono text-[20px] font-extrabold"
              style={{ color: riskColor(job.final_risk_score) }}
            >
              {job.final_risk_score}
            </span>
          </div>
        ) : null}
      </div>

      {/* Stepper completo desta execução. Não estava em `renderReportDetail`
          (o protótipo só mostrava a versão compacta nas linhas do histórico),
          mas é a informação que dá contexto ao PR e ao risk score acima. */}
      <div className="stat-card mb-6">
        <div style={{ maxWidth: 700 }}>
          <TierStepper job={job} />
        </div>
      </div>

      {prRems.length > 0 ? (
        <div className="stat-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="flex items-center gap-2.5"
            style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}
          >
            <IconPullRequest />
            <h2 className="text-[15px] font-bold">Pull Request enviado</h2>
            <span className="sev st-queued" style={{ marginLeft: 'auto' }}>
              Merge bloqueado · aguarda aprovação
            </span>
          </div>

          <div style={{ padding: '18px 20px' }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14.5px] font-semibold">
                fix(security): remediações do scan aperIA
              </span>
              <span className="mono text-[12px] text-fg-dim">PR #{job.pr_number}</span>
            </div>
            <div className="mono mt-1 text-[11px] text-fg-dim">
              aperia/fix-{shortSha(job.commit_sha)} → main · commit{' '}
              {shortSha(job.commit_sha)} ·{' '}
              <span title={fmtAbs(job.created_at)} className="cursor-help">
                {timeAgo(job.created_at)}
              </span>
            </div>

            <div
              style={{
                marginTop: 14,
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg-surface-raised)',
                  borderBottom: '1px solid var(--border-default)',
                }}
              >
                <span
                  className="grid place-items-center rounded-full text-[10px] font-bold"
                  style={{ width: 22, height: 22, background: '#d81f2a', color: '#fff' }}
                >
                  aI
                </span>
                <span className="text-[12.5px] font-semibold">aperIA-bot</span>
                <span className="text-[11px] text-fg-dim">
                  comentou {timeAgo(job.created_at)}
                </span>
              </div>
              <div
                style={{
                  padding: 14,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                }}
              >
                Scan concluído
                {job.final_risk_score ? (
                  <>
                    {' '}
                    com risk score{' '}
                    <b style={{ color: riskColor(job.final_risk_score) }}>
                      {job.final_risk_score}
                    </b>
                  </>
                ) : null}
                . {prRems.length} {prRems.length === 1 ? 'patch' : 'patches'} de remediação{' '}
                {prRems.length === 1 ? 'sugerido' : 'sugeridos'} abaixo — o merge exige
                aprovação humana.
              </div>
            </div>

            {prRems.map((rem) => {
              const finding = FINDINGS.find((f) => f.id === rem.finding_id);
              return (
                <div key={rem.id} style={{ marginTop: 14 }}>
                  <div className="mb-2 flex items-center gap-2">
                    {finding?.severity ? <SevBadge severity={finding.severity} /> : null}
                    <span className="text-[13px] font-semibold">
                      {finding?.title || `Finding ${rem.finding_id}`}
                    </span>
                  </div>
                  <DiffView patch={rem.patch_diff} filePath={finding?.file_path} />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="stat-card mb-6">
          <EmptyState
            title="Nenhum Pull Request enviado ainda"
            body={
              running
                ? 'Esta execução ainda está em andamento. O PR com as remediações aparece aqui quando a análise terminar.'
                : 'Esta execução não gerou patches de remediação.'
            }
          />
        </div>
      )}

      <div className="stat-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-[15px] font-bold">Histórico de scans</h2>
        </div>

        {jobs.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: 13,
            }}
          >
            {assetType === 'repository'
              ? 'Nenhum scan executado neste repositório ainda.'
              : 'Asset cloud: varreduras contínuas via Prowler, sem histórico de PR.'}
          </div>
        ) : (
          jobs.map((j) => {
            const remCount = REMEDIATIONS.filter((r) => r.scan_job_id === j.id).length;
            const current = j.id === job.id;

            return (
              <Link
                key={j.id}
                href={reportDetailRoute(j.id)}
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
                    PR #{j.pr_number}{' '}
                    <span className="mono text-fg-dim" style={{ fontSize: 11 }}>
                      {shortSha(j.commit_sha)}
                    </span>
                    {remCount ? (
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {' '}
                        · {remCount} {remCount === 1 ? 'remediação' : 'remediações'}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="mono mt-0.5"
                    style={{ fontSize: 11, color: 'var(--text-faint)' }}
                  >
                    <span title={fmtAbs(j.created_at)} className="cursor-help">
                      {timeAgo(j.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <TierStepperCompact job={j} />
                </div>

                <div className="flex items-center justify-end gap-1.5">
                  {j.final_risk_score ? (
                    <>
                      <MiniGauge score={j.final_risk_score} />
                      <span
                        className="mono font-bold"
                        style={{ fontSize: 14, color: riskColor(j.final_risk_score) }}
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
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            );
          })
        )}
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-[15px] font-bold">
            Findings encontrados pós-scan{' '}
            <span className="text-[12px] font-normal text-fg-dim">
              · {assetFindings.length} no total
              {assetFindings.length > MAX_FINDING_ROWS ? ' · exibindo 30' : ''}
            </span>
          </h2>
        </div>

        <table className="dtbl">
          <colgroup>
            <col />
            <col style={{ width: 220 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              <th className="cl">Finding</th>
              <th>Arquivo</th>
              <th>CVE/CWE</th>
              <th>Scanner</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {assetFindings.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: 'var(--text-dim)',
                    fontSize: 13,
                  }}
                >
                  Nenhum finding neste asset.
                </td>
              </tr>
            ) : (
              assetFindings.slice(0, MAX_FINDING_ROWS).map((f) => (
                <tr
                  key={f.id}
                  className="rowlink"
                  /* No protótipo abria o drawer de finding na própria tela; com
                     rotas reais, manda para Findings com o id na query. */
                  onClick={() => router.push(findingRoute(f.id))}
                >
                  <td className="cl">
                    <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                      <SevBadge severity={f.severity} />
                      <span className="lnk truncate text-[13px] font-medium text-fg">
                        {f.title}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="mono text-[11px] text-fg-dim">
                      {f.file_path || '—'}
                      {f.line_number ? `:${f.line_number}` : ''}
                    </span>
                  </td>
                  <td>
                    <span className="mono text-[11px] text-fg-dim">
                      {f.cve_id || f.cwe_id || '—'}
                    </span>
                  </td>
                  <td>
                    <span className="mono text-[11px] text-fg-dim">
                      {(f.source || '').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {f.status === 'resolved' ? (
                      <span className="sev st-done">resolvido</span>
                    ) : (
                      <span className="sev st-queued">aberto</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
