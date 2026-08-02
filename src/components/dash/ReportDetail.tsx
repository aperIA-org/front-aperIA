'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ScanReport } from '@/lib/api/scans';
import { reportDetailRoute, SCREEN_ROUTES, findingRoute } from '@/lib/dash/dash-routes';
import { fmtAbs, riskColor, riskMax, scanRanAt, shortSha, timeAgo } from '@/lib/dash/format';
import { ASSETS, FINDINGS, GH_ORG, REMEDIATIONS, SCAN_JOBS } from '@/lib/dash/mock-data';
import type { Finding, RiskLevel, ScanJob } from '@/lib/dash/types';
import { EmptyState } from './EmptyState';
import { DiffView } from './DiffView';
import { Markdown } from './Markdown';
import { MiniGauge } from './RiskGauge';
import { SevBadge } from './SevBadge';
import { TierStepper } from './TierStepper';
import { TierStepperCompact } from './TierStepperCompact';

/** Máximo de findings listados na tabela — o resto fica na tela de Findings. */
const MAX_FINDING_ROWS = 30;

const RISK_LEVEL_PT: Record<Exclude<RiskLevel, null>, string> = {
  critical: 'crítico',
  high: 'alto',
  medium: 'médio',
  low: 'baixo',
  blocked: 'bloqueado',
};

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

function Sep() {
  return <span aria-hidden="true">·</span>;
}

type ReportDetailProps = {
  /** Execução: da API (`GET /scans/{sha}`) ou do dataset do protótipo. */
  job: ScanJob;
  /**
   * Relatórios do pipeline, um por tier — é ESTE markdown que é o relatório.
   * Vazio em demonstração, onde a tela ainda compõe o conteúdo à mão.
   */
  reports: ScanReport[];
  /** Findings do commit (API) ou do asset (demonstração). */
  findings: Finding[];
  /** `false` = a API não respondeu; é diferente de "nenhum finding". */
  findingsOk: boolean;
  /**
   * Execuções anteriores do MESMO commit (`GET /scans/{id}/history`), da mais
   * recente para a mais antiga. Em modo demo é ignorada: o dataset do protótipo
   * não tem commit repetido, então lá o histórico é o do repositório.
   */
  history?: ScanJob[];
  /**
   * `true` = dataset do protótipo. Só nesse modo existem PR enviado, patches de
   * remediação e histórico de scans: a API não expõe rota de remediações e o
   * detalhe carrega uma única execução. Misturar mock com dado real seria mentir.
   */
  demo: boolean;
  /**
   * Âncora de tempo, calculada no server component. `REF_NOW` em demonstração;
   * o agora real com a API. `Date.now()` no cliente divergiria do HTML do
   * servidor e quebraria a hidratação — ver CLAUDE.md.
   */
  now: number;
};

/**
 * Detalhe de uma execução do pipeline.
 *
 * Com dados reais o corpo é o markdown gerado pelo pipeline (`report_markdown`),
 * um relatório por tier, mais os findings daquele commit. Em demonstração o
 * porte de `renderReportDetail` (`legacy/dash/index.html`, linhas 2299–2385)
 * segue como estava: PR enviado com os patches e histórico de scans do repo.
 */
export function ReportDetail({
  job,
  reports,
  findings,
  findingsOk,
  history: historyProp = [],
  demo,
  now,
}: ReportDetailProps) {
  const router = useRouter();
  const [tier, setTier] = useState<number>(reports[0]?.tier ?? 1);

  const activeReport = reports.find((r) => r.tier === tier) ?? reports[0] ?? null;

  const shortName = job.repo_full_name.split('/')[1] ?? job.repo_full_name;
  const running = [job.tier1_status, job.tier2_status, job.tier3_status].includes('running');

  /* Blocos sem fonte na API: só existem sobre o dataset do protótipo. */
  const asset = demo ? ASSETS.find((a) => a.name === shortName) : undefined;
  const prRems = demo ? REMEDIATIONS.filter((r) => r.scan_job_id === job.id) : [];
  /*
   * Duas coisas diferentes com a mesma apresentação: no protótipo, os scans do
   * repositório (nenhum commit se repete lá); com dados reais, as execuções
   * deste commit — que passaram a existir quando rescanear a mesma branch
   * deixou de sobrescrever a execução anterior.
   */
  const history = demo
    ? SCAN_JOBS.filter((j) => j.repo_full_name === `${GH_ORG}/${shortName}`).sort(
        (a, b) => Date.parse(scanRanAt(b)) - Date.parse(scanRanAt(a)),
      )
    : historyProp;
  // Com uma execução só não há histórico — a linha seria a própria tela.
  const showHistory = demo || history.length > 1;

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

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div style={{ minWidth: 0 }}>
          <h1 className="text-[24px] font-bold tracking-tight">{job.repo_full_name}</h1>
          <div className="mono mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-fg-dim">
            <span>commit {shortSha(job.commit_sha)}</span>
            <Sep />
            {/* `pr_number = 0` é o scan manual: roda pelo botão, fora de um PR. */}
            <span>{job.pr_number ? `PR #${job.pr_number}` : 'scan manual'}</span>
            <Sep />
            <span title={fmtAbs(scanRanAt(job))} className="cursor-help">
              {timeAgo(scanRanAt(job), now)}
            </span>
            {findingsOk ? (
              <>
                <Sep />
                <span>
                  {findings.length} {findings.length === 1 ? 'finding' : 'findings'}
                </span>
              </>
            ) : null}
            {asset?.criticality ? (
              <>
                <Sep />
                <span>criticidade {asset.criticality}</span>
              </>
            ) : null}
          </div>
        </div>

        {job.final_risk_score !== null ? (
          <div className="flex flex-shrink-0 items-center gap-2">
            <MiniGauge score={job.final_risk_score} max={riskMax(demo)} />
            <div>
              <div
                className="mono text-[20px] font-extrabold leading-none"
                style={{ color: riskColor(job.final_risk_score, riskMax(demo)) }}
              >
                {job.final_risk_score}
              </div>
              {job.final_risk_level ? (
                <div className="mt-1 text-[11px] text-fg-dim">
                  risco {RISK_LEVEL_PT[job.final_risk_level]}
                </div>
              ) : null}
            </div>
          </div>
        ) : job.final_risk_level ? (
          <span
            className={`sev ${job.final_risk_level === 'blocked' ? 'st-blocked' : 'st-queued'}`}
          >
            {RISK_LEVEL_PT[job.final_risk_level]}
          </span>
        ) : null}
      </div>

      {/* Stepper completo desta execução. Não estava em `renderReportDetail`
          (o protótipo só mostrava a versão compacta nas linhas do histórico),
          mas é a informação que dá contexto ao relatório e ao risk score. */}
      <div className="stat-card mb-6">
        <div style={{ maxWidth: 700 }}>
          <TierStepper job={job} />
        </div>
      </div>

      {!demo ? (
        <div className="stat-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="flex flex-wrap items-center gap-3"
            style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}
          >
            <h2 className="text-[15px] font-bold">Relatório do pipeline</h2>
            {reports.length > 1 ? (
              <div className="ml-auto flex flex-wrap gap-1.5">
                {reports.map((report) => (
                  <button
                    key={report.tier}
                    type="button"
                    className={`chip${report.tier === activeReport?.tier ? ' on' : ''}`}
                    aria-pressed={report.tier === activeReport?.tier}
                    onClick={() => setTier(report.tier)}
                  >
                    Tier {report.tier}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {activeReport ? (
            <div style={{ padding: '18px 20px' }}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="mono text-[12px] font-bold text-fg">
                  Tier {activeReport.tier}
                </span>
                {activeReport.degraded ? (
                  <span
                    className="sev st-queued"
                    title="O pipeline não conseguiu usar o modelo de IA nesta execução — o conteúdo abaixo veio só dos scanners."
                  >
                    Modo degradado · sem IA
                  </span>
                ) : null}
                {job.pr_number ? (
                  activeReport.posted ? (
                    <span className="sev st-done">Comentado no PR</span>
                  ) : (
                    <span
                      className="sev st-skipped"
                      title="O relatório foi gerado mas não chegou a ser publicado como comentário no pull request."
                    >
                      Não comentado no PR
                    </span>
                  )
                ) : null}
                <span
                  className="mono ml-auto cursor-help text-[11px] text-fg-dim"
                  title={fmtAbs(activeReport.created_at)}
                >
                  {timeAgo(activeReport.created_at, now)}
                </span>
              </div>

              {activeReport.report_markdown.trim() ? (
                <Markdown source={activeReport.report_markdown} />
              ) : (
                <p className="text-[13px] text-fg-dim">
                  O pipeline registrou este tier sem conteúdo de relatório.
                </p>
              )}
            </div>
          ) : (
            <EmptyState
              title="Relatório ainda não disponível"
              body={
                running
                  ? 'Esta execução ainda está em andamento — o relatório aparece aqui quando o tier terminar.'
                  : 'O pipeline não gerou relatório em markdown para esta execução.'
              }
            />
          )}
        </div>
      ) : null}

      {demo && prRems.length > 0 ? (
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
              <span title={fmtAbs(scanRanAt(job))} className="cursor-help">
                {timeAgo(scanRanAt(job), now)}
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
                  comentou {timeAgo(scanRanAt(job), now)}
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
                    <b style={{ color: riskColor(job.final_risk_score, riskMax(demo)) }}>
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
      ) : null}

      {demo && prRems.length === 0 ? (
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
      ) : null}

      {showHistory ? (
        <div className="stat-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}>
            <h2 className="text-[15px] font-bold">
              {demo ? 'Histórico de scans' : 'Execuções deste commit'}
            </h2>
            {!demo && (
              <p className="mt-0.5 text-[12px] text-fg-dim">
                Cada rescan da mesma branch guarda o próprio relatório.
              </p>
            )}
          </div>

          {history.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'var(--text-dim)',
                fontSize: 13,
              }}
            >
              {asset?.type === 'cloud'
                ? 'Asset cloud: varreduras contínuas via Prowler, sem histórico de PR.'
                : 'Nenhum scan executado neste repositório ainda.'}
            </div>
          ) : (
            history.map((j) => {
              // Remediações são mock; com dados reais não há rota para elas.
              const remCount = demo
                ? REMEDIATIONS.filter((r) => r.scan_job_id === j.id).length
                : 0;
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
                      {/* `pr_number` é 0 em scan manual (roda sem PR). */}
                      {j.pr_number > 0 ? `PR #${j.pr_number} ` : 'Execução '}
                      <span className="mono text-fg-dim" style={{ fontSize: 11 }}>
                        {shortSha(j.commit_sha)}
                      </span>
                      {remCount ? (
                        <span
                          className="text-[11px]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {' '}
                          · {remCount} {remCount === 1 ? 'remediação' : 'remediações'}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="mono mt-0.5"
                      style={{ fontSize: 11, color: 'var(--text-faint)' }}
                    >
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
                      <span
                        className="mono"
                        style={{ fontSize: 13, color: 'var(--border-mid)' }}
                      >
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
      ) : null}

      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-[15px] font-bold">
            {demo ? 'Findings encontrados pós-scan' : 'Findings deste commit'}{' '}
            {findingsOk ? (
              <span className="text-[12px] font-normal text-fg-dim">
                · {findings.length} no total
                {findings.length > MAX_FINDING_ROWS ? ` · exibindo ${MAX_FINDING_ROWS}` : ''}
              </span>
            ) : null}
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
              {/* A API não modela resolução de finding: tudo que ela devolve
                  está aberto. Em dado real a coluna útil é o tier. */}
              <th>{demo ? 'Status' : 'Tier'}</th>
            </tr>
          </thead>
          <tbody>
            {!findingsOk || findings.length === 0 ? (
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
                  {!findingsOk
                    ? 'Não foi possível carregar os findings desta execução.'
                    : demo
                      ? 'Nenhum finding neste asset.'
                      : 'Nenhum finding registrado para este commit.'}
                </td>
              </tr>
            ) : (
              findings.slice(0, MAX_FINDING_ROWS).map((f) => (
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
                    {/* `block` + `truncate`: a tabela é `table-layout: fixed`,
                        e um <span> inline não recorta — caminhos longos como
                        `frontend/src/assets/i18n/pt_BR.json` transbordavam para
                        a célula vizinha. O `title` preserva o valor inteiro,
                        que o truncamento esconde. */}
                    <span
                      className="mono block truncate text-[11px] text-fg-dim"
                      title={
                        f.file_path
                          ? `${f.file_path}${f.line_number ? `:${f.line_number}` : ''}`
                          : undefined
                      }
                    >
                      {f.file_path || '—'}
                      {f.line_number ? `:${f.line_number}` : ''}
                    </span>
                  </td>
                  <td>
                    {/* Mesmo motivo da coluna Arquivo. Aqui o caso real é o
                        fallback do normalizador de CWE no back-end, que devolve
                        até 50 caracteres quando não acha o identificador. */}
                    <span
                      className="mono block truncate text-[11px] text-fg-dim"
                      title={f.cve_id || f.cwe_id || undefined}
                    >
                      {f.cve_id || f.cwe_id || '—'}
                    </span>
                  </td>
                  <td>
                    <span className="mono block truncate text-[11px] text-fg-dim">
                      {(f.source || '').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {demo ? (
                      f.status === 'resolved' ? (
                        <span className="sev st-done">resolvido</span>
                      ) : (
                        <span className="sev st-queued">aberto</span>
                      )
                    ) : (
                      <span className="mono text-[11px] text-fg-dim">T{f.tier}</span>
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
