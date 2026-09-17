import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AttackPathCard } from '@/components/dash/AttackPathCard';
import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { FindingsByTier } from '@/components/dash/FindingsByTier';
import { ReportDetail } from '@/components/dash/ReportDetail';
import { KpiTileSkeleton, ReportHeader } from '@/components/dash/ReportHeader';
import { ReportHistory } from '@/components/dash/ReportHistory';
import { ReportLive } from '@/components/dash/ReportLive';
import {
  AttackPathSkeleton,
  FindingsSkeleton,
  ReportImpactSkeleton,
} from '@/components/dash/ReportSkeletons';
import { ReportIaTiles, ReportImpact } from '@/components/dash/ReportImpact';
import { ScanQueuedCard } from '@/components/dash/ScanQueuedCard';
import { fetchFindingGroups } from '@/lib/api/findings';
import { resolveGitHubConnection } from '@/lib/api/github';
import {
  fetchScan,
  fetchScanHistory,
  fetchScanTools,
} from '@/lib/api/scans';
import { monitoredRepos } from '@/lib/dash/github';
import { isJobRunning, nadaConcluido } from '@/lib/dash/scan-state';
import { reportOrigin, type ReportOrigin } from '@/lib/dash/dash-routes';
import { FINDINGS, REF_NOW, SCAN_JOBS } from '@/lib/dash/mock-data';
import type { ScanJob } from '@/lib/dash/types';

/**
 * Detalhe de uma execução.
 *
 * O `[id]` é o id da **execução** — uuid na API, id sintético (`s1`, `s2`…) no
 * dataset do protótipo. Já foi o `commit_sha`, quando um commit tinha uma
 * execução só; agora rescanear a mesma branch empilha execuções e cada uma tem
 * o seu relatório, então o sha não endereça mais uma tela.
 *
 * ─── A composição da tela ────────────────────────────────────────────────────
 *
 * Quatro blocos, e o terceiro troca de acordo com o estado da execução:
 *
 * 1. cabeçalho (risco, identidade, faixa de indicadores)
 * 2. **impacto ao negócio** — a tradução do risco técnico para quem decide
 * 3. **`ScanQueuedCard`** enquanto nada concluiu · **`AttackPathCard`** depois
 * 4. os findings por etapa
 * 5. as execuções deste commit, fechadas — referência, não a leitura principal
 *
 * O trilho lateral do `ScanPipeline` **não** entra aqui: o estado por etapa vive
 * nas bandas do card de findings, e o Tier 3 tem card próprio, com o trilho
 * centralizado. O `ScanPipeline` continua sendo o desenho da tela de Scans.
 *
 * ─── Por que a página é montada em pedaços ───────────────────────────────────
 *
 * Um scan leva de 3 a 60 minutos, então "em andamento" é o estado mais visto
 * desta tela. Antes, ela esperava `scan` + `relatório` + `ferramentas` +
 * `findings` resolverem TODOS para pintar qualquer coisa — e nem tinha estado de
 * carregamento, então ficava em branco.
 *
 * O relatório em markdown do pipeline (`report_markdown`, um por tier) NÃO é
 * mais exibido aqui: o veredito executivo, o card de caminhos de ataque e os
 * findings por etapa cobrem a mesma leitura de forma estruturada, e um bloco de
 * prosa gerada por LLM abaixo deles repetia o que os três já diziam. A rota
 * `GET /scans/{id}/report` da API continua existindo — só não tem consumidor.
 *
 * Agora só `GET /scans/{id}` é aguardado aqui. Ele traz repositório, commit,
 * status por tier, risco **e** `findings_summary` (contagem por severidade e por
 * tier, agregada pela própria API), o que é exatamente o cabeçalho inteiro — uma
 * requisição, e a tela já tem identidade e números. O resto entra por
 * `<Suspense>`, cada seção com o seu placeholder e no seu tempo.
 *
 * `fetchScanTools` é `cache()`-ado e aparece em quatro seções: é uma requisição
 * só, deduplicada no render.
 */
export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const preview = Array.isArray(query.preview) ? query.preview[0] : query.preview;
  // De onde o usuário veio, para a trilha voltar para lá em vez de despejá-lo
  // numa terceira tela. Valor desconhecido cai no padrão (Relatórios).
  const origem = reportOrigin(Array.isArray(query.de) ? query.de[0] : query.de);

  // No preview do cadastro a conexão nem é consultada: aquele iframe não tem
  // sessão, e uma chamada à API ali só somaria latência ao carrossel.
  if (preview === '1') return renderDemo(id);

  // Independentes: a conexão resolve o alvo de DAST do repositório e o modo
  // demonstração, e o scan é o que a tela precisa primeiro. Sem API configurada
  // `fetchScan` curto-circuita, então isto não custa nada em demonstração.
  const [connection, job] = await Promise.all([
    resolveGitHubConnection(),
    fetchScan(id),
  ]);

  if (connection.demo) return renderDemo(id);
  if (!job) notFound();

  // `Date.now()` no SERVER COMPONENT. No cliente divergiria do HTML servido e
  // quebraria a hidratação — e o relógio congelado do protótipo (`REF_NOW`,
  // 2024-06-29) filtraria todo finding real.
  const now = Date.now();
  /*
   * `isJobRunning`, o mesmo da lista de Scans. `tiers.includes('running')`
   * respondia "parado" na janela entre dois tiers e na execução recém-
   * enfileirada — e era esse booleano que ligava o polling, então o Estado 3
   * (scan disparado agora) nascia sem atualização automática e congelava.
   */
  const running = isJobRunning(job);
  const inicial = nadaConcluido(job);

  /*
   * Alvo de DAST deste repositório, resolvido no servidor.
   *
   * `null` = repositório monitorado sem alvo, e aí o ZAP não tinha o que
   * escanear no Tier 3. `undefined` = repositório fora da lista monitorada, e a
   * tela não afirma nada sobre o ZAP.
   */
  const monitorado = monitoredRepos(connection).find(
    (repo) => repo.full_name === job.repo_full_name,
  );
  const dastTarget = monitorado ? monitorado.target_url : undefined;

  return (
    <DataScreenGate>
      <div className="rep-page">
        {/* Enquanto roda, a tela se atualiza sozinha a cada 5s. */}
        <ReportLive active={running} />

        <ReportHeader
          job={job}
          findings={{
            total: job.findings_summary?.total ?? null,
            bySeverity: job.findings_summary?.by_severity,
          }}
          demo={false}
          now={now}
          origem={origem}
          iaTiles={
            <Suspense
              fallback={
                <>
                  <KpiTileSkeleton label="Esforço de correção" />
                  <KpiTileSkeleton label="Prazo recomendado" />
                </>
              }
            >
              <IaTilesSection job={job} />
            </Suspense>
          }
        />

        <Suspense fallback={<ReportImpactSkeleton />}>
          <ImpactSection job={job} now={now} />
        </Suspense>

        {/* Nada concluído: o card mostra o pipeline que VAI rodar, com o SLA e a
            descrição de cada etapa. Os dois cards juntos diriam a mesma coisa
            duas vezes, e o card de caminhos ficaria inteiro na fila. */}
        {inicial ? (
          <ScanQueuedCard job={job} now={now} />
        ) : (
          <Suspense fallback={<AttackPathSkeleton />}>
            <AttackPathSection job={job} targetUrl={dastTarget} />
          </Suspense>
        )}

        <Suspense fallback={<FindingsSkeleton rows={3} />}>
          <FindingsSection job={job} targetUrl={dastTarget} />
        </Suspense>

        {/* Por último, e fechado: as execuções anteriores são referência, não a
            leitura principal desta tela. */}
        <Suspense fallback={null}>
          <HistorySection job={job} now={now} origem={origem} />
        </Suspense>
      </div>
    </DataScreenGate>
  );
}

/* ═══════════════════════ seções assíncronas ═══════════════════════ */

async function IaTilesSection({ job }: { job: ScanJob }) {
  const { ia } = await fetchScanTools(job.id);
  return <ReportIaTiles job={job} ia={ia} />;
}

async function ImpactSection({ job, now }: { job: ScanJob; now: number }) {
  const { ia } = await fetchScanTools(job.id);
  return <ReportImpact job={job} ia={ia} now={now} />;
}

async function AttackPathSection({
  job,
  targetUrl,
}: {
  job: ScanJob;
  targetUrl?: string | null;
}) {
  // Por execução, e não por commit: duas execuções do mesmo commit rodam as
  // ferramentas de novo, com desfechos que podem divergir.
  const { tools, ia } = await fetchScanTools(job.id);
  return <AttackPathCard job={job} runs={tools} ia={ia} targetUrl={targetUrl} />;
}

async function HistorySection({
  job,
  now,
  origem,
}: {
  job: ScanJob;
  now: number;
  origem: ReportOrigin;
}) {
  const history = await fetchScanHistory(job.id);
  // Com uma execução só não há histórico — a linha seria a própria tela.
  if (history.length <= 1) return null;
  return (
    <ReportHistory job={job} history={history} demo={false} now={now} origem={origem} />
  );
}

async function FindingsSection({
  job,
  targetUrl,
}: {
  job: ScanJob;
  targetUrl?: string | null;
}) {
  /*
   * Agrupado, e escopado ao COMMIT.
   *
   * A tela mostrava a lista plana, que vinha de `fetchFindings(commit_sha)` —
   * paginando de 200 em 200 até o teto de 1000, ou seja até CINCO requisições
   * sequenciais, para exibir 30 linhas. E o número exibido era o coletado, não o
   * total: num commit de DAST (~12 mil findings) já saía errado.
   *
   * `GET /findings/groups?commit_sha=` responde em uma requisição e sem teto: o
   * agrupamento derruba 12 mil ocorrências em algumas dezenas de problemas. As
   * ocorrências de um problema ficam a um clique, recortadas no servidor.
   *
   * Independentes: `fetchScanTools` costuma já estar resolvido pelas outras
   * seções (é `cache()`-ado), mas depender dessa ordem seria sorte.
   */
  const [{ groups, ok }, { tools, ia }] = await Promise.all([
    fetchFindingGroups(job.commit_sha),
    fetchScanTools(job.id),
  ]);
  return (
    <FindingsByTier
      job={job}
      groups={groups}
      toolRuns={tools}
      ia={ia}
      targetUrl={targetUrl}
      ok={ok}
    />
  );
}

/* ═══════════════════════ demonstração ═══════════════════════ */

/**
 * O dataset do protótipo, que segue no `ReportDetail`.
 *
 * Ele tem um bloco que a API não expõe — o PR enviado com os patches de
 * remediação —, e é o que o carrossel do cadastro mostra. Um id inexistente dá
 * 404 aqui também, em vez de tela quebrada.
 */
function renderDemo(id: string) {
  const job = SCAN_JOBS.find((j) => j.id === id);
  if (!job) notFound();

  const shortName = job.repo_full_name.split('/')[1] ?? job.repo_full_name;

  return (
    <DataScreenGate>
      <ReportDetail
        job={job}
        findings={FINDINGS.filter((f) => f.asset === shortName)}
        now={REF_NOW}
      />
    </DataScreenGate>
  );
}
