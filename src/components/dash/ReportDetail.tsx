import { fmtAbs, riskColor, riskMax, scanRanAt, shortSha, timeAgo } from '@/lib/dash/format';
import { ASSETS, FINDINGS, GH_ORG, REMEDIATIONS, SCAN_JOBS } from '@/lib/dash/mock-data';
import type { Finding, ScanJob } from '@/lib/dash/types';
import { groupFindings } from '@/lib/dash/findings-groups';
import { EmptyState } from './EmptyState';
import { DiffView } from './DiffView';
import { FindingsByTier } from './FindingsByTier';
import { ReportHeader } from './ReportHeader';
import { ReportHistory } from './ReportHistory';
import { SevBadge } from './SevBadge';
import { AttackPathCard } from './AttackPathCard';
import { ReportImpact } from './ReportImpact';
import { ScanQueuedCard } from './ScanQueuedCard';
import { nadaConcluido } from '@/lib/dash/scan-state';

/**
 * Detalhe de uma execução **em demonstração** — o dataset do protótipo.
 *
 * Com dados reais a tela é montada em `page.tsx`, em seções que carregam
 * separadamente. Aqui não há o que carregar: o dataset é síncrono, e existem
 * dois blocos que a API não tem de onde tirar — o PR enviado com os patches de
 * remediação (não existe rota de remediações) e o histórico de scans do
 * repositório (com dado real o histórico é das execuções do mesmo commit).
 *
 * O cabeçalho e o histórico são os MESMOS componentes das duas telas: um desenho
 * por modo faria a navegação do carrossel do cadastro parecer outro produto.
 *
 * Porte de `renderReportDetail` (`legacy/dash/index.html`, linhas 2299–2385).
 */

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

export function ReportDetail({
  job,
  findings,
  now,
}: {
  job: ScanJob;
  /** Findings do asset, no dataset do protótipo. */
  findings: Finding[];
  /** `REF_NOW`: o relógio do protótipo é congelado em 2024-06-29. */
  now: number;
}) {
  const shortName = job.repo_full_name.split('/')[1] ?? job.repo_full_name;
  const running = [job.tier1_status, job.tier2_status, job.tier3_status].includes('running');

  const asset = ASSETS.find((a) => a.name === shortName);
  const prRems = REMEDIATIONS.filter((r) => r.scan_job_id === job.id);
  // No protótipo, os scans do REPOSITÓRIO: nenhum commit se repete lá, então
  // "execuções deste commit" seria sempre uma linha.
  const history = SCAN_JOBS.filter(
    (j) => j.repo_full_name === `${GH_ORG}/${shortName}`,
  ).sort((a, b) => Date.parse(scanRanAt(b)) - Date.parse(scanRanAt(a)));
  /* Mapa, não callback: `ReportHistory` é cliente e uma função não atravessa a
     fronteira server → client. */
  const remCounts = Object.fromEntries(
    history.map((j) => [j.id, REMEDIATIONS.filter((r) => r.scan_job_id === j.id).length]),
  );

  return (
    <div className="rep-page">
      <ReportHeader
        job={job}
        findings={{
          total: findings.length,
          bySeverity: findings.reduce<Record<string, number>>((acc, f) => {
            acc[f.severity] = (acc[f.severity] ?? 0) + 1;
            return acc;
          }, {}),
        }}
        demo
        now={now}
        /* O dataset do protótipo não tem `analysis_json`, então a leitura
           executiva não existe aqui — e dizer "não calculado" é a verdade, o
           mesmo texto que a tela real mostra num relatório antigo. */
        iaTiles={<DemoIaTiles />}
      />

      {/* Sem `analysis_json` no protótipo não há tradução para o negócio, e o
          bloco diz isso — o mesmo texto que a tela real mostra num relatório
          antigo. Existe aqui para o carrossel do cadastro mostrar a tela toda. */}
      <ReportImpact job={job} ia={null} now={now} />

      {/* Mesma composição do caminho de dado real: o card do pipeline previsto
          enquanto nada concluiu, o card dos caminhos de ataque depois. Sem `ia`
          (o protótipo não tem `analysis_json`), então ele diz que ninguém
          calculou — não que não há caminho. */}
      {nadaConcluido(job) ? (
        <ScanQueuedCard job={job} now={now} />
      ) : (
        <AttackPathCard job={job} ia={null} />
      )}

      {prRems.length > 0 ? (
        <div className="rep-card rep-mb" style={{ padding: 0, overflow: 'hidden' }}>
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
                    <b style={{ color: riskColor(job.final_risk_score, riskMax(true)) }}>
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
        <div className="rep-card rep-mb" style={{ padding: 20 }}>
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

      {/* Agrupado, igual ao dado real: `groupFindings` existe justamente para o
          dataset do protótipo passar pelo mesmo desenho sem a API. */}
      <FindingsByTier job={job} groups={groupFindings(findings)} ia={null} ok />

      {history.length > 0 ? (
        <ReportHistory
          job={job}
          history={history}
          demo
          now={now}
          remCounts={remCounts}
        />
      ) : (
        <div className="rep-card rep-mb" style={{ padding: 24, textAlign: 'center' }}>
          <span className="text-[13px] text-fg-dim">
            {asset?.type === 'cloud'
              ? 'Asset cloud: varreduras contínuas via Prowler, sem histórico de PR.'
              : 'Nenhum scan executado neste repositório ainda.'}
          </span>
        </div>
      )}

    </div>
  );
}

/** Os dois tiles da leitura executiva em demonstração: não há `analysis_json`. */
function DemoIaTiles() {
  return (
    <>
      <div>
        <div className="rep-kpi-lb">Esforço de correção</div>
        <div className="rep-kpi-vl" data-wait="true">
          não calculado
        </div>
      </div>
      <div>
        <div className="rep-kpi-lb">Prazo recomendado</div>
        <div className="rep-kpi-vl" data-wait="true">
          não calculado
        </div>
      </div>
    </>
  );
}
