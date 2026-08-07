import { notFound } from 'next/navigation';
import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { ReportDetail } from '@/components/dash/ReportDetail';
import { fetchFindings } from '@/lib/api/findings';
import { resolveGitHubConnection } from '@/lib/api/github';
import { fetchScan, fetchScanHistory, fetchScanReports } from '@/lib/api/scans';
import { FINDINGS, REF_NOW, SCAN_JOBS } from '@/lib/dash/mock-data';

/**
 * Detalhe de uma execução.
 *
 * O `[id]` é o id da **execução** — uuid na API, id sintético (`s1`, `s2`…) no
 * dataset do protótipo. Já foi o `commit_sha`, quando um commit tinha uma
 * execução só; agora rescanear a mesma branch empilha execuções e cada uma tem
 * o seu relatório, então o sha não endereça mais uma tela.
 *
 * Um id inexistente dá 404 em vez de tela quebrada, nos dois modos.
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

  // O `||` curto-circuita: em preview a conexão nem é consultada.
  const demo = preview === '1' || (await resolveGitHubConnection()).demo;

  if (demo) {
    const job = SCAN_JOBS.find((j) => j.id === id);
    if (!job) notFound();

    const shortName = job.repo_full_name.split('/')[1] ?? job.repo_full_name;

    return (
      <DataScreenGate>
        <ReportDetail
          job={job}
          reports={[]}
          findings={FINDINGS.filter((f) => f.asset === shortName)}
          findingsOk
          demo
          now={REF_NOW}
        />
      </DataScreenGate>
    );
  }

  const job = await fetchScan(id);
  if (!job) notFound();

  // Independentes entre si — sequenciar só somaria latência. Os findings vão
  // pelo COMMIT, não pela execução: eles não são escopados por execução (o
  // mesmo commit é o mesmo código), então duas execuções do mesmo commit
  // mostram o mesmo conjunto. O que difere entre elas é o relatório.
  const [reports, findingsResult, history] = await Promise.all([
    fetchScanReports(job.id),
    fetchFindings(job.commit_sha),
    fetchScanHistory(job.id),
  ]);

  return (
    <DataScreenGate>
      <ReportDetail
        job={job}
        reports={reports}
        findings={findingsResult.findings}
        findingsOk={findingsResult.ok}
        history={history}
        demo={false}
        now={Date.now()}
      />
    </DataScreenGate>
  );
}
