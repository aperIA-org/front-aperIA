import { notFound } from 'next/navigation';
import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { ReportDetail } from '@/components/dash/ReportDetail';
import { fetchFindings } from '@/lib/api/findings';
import { resolveGitHubConnection } from '@/lib/api/github';
import { fetchScan, fetchScanReports } from '@/lib/api/scans';
import { FINDINGS, REF_NOW, SCAN_JOBS } from '@/lib/dash/mock-data';

/**
 * Detalhe de uma execução.
 *
 * O `[id]` mudou de natureza: na API a identidade de um scan é o **`commit_sha`**
 * (não existe id próprio), então a URL passa a ser `/dash/relatorios/<sha>`. No
 * dataset do protótipo continua sendo o id sintético (`s1`, `s2`…), e é por isso
 * que a resolução se divide pelos dois caminhos.
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

  // Independentes entre si — sequenciar só somaria latência.
  const [reports, findingsResult] = await Promise.all([
    fetchScanReports(id),
    fetchFindings(id),
  ]);

  return (
    <DataScreenGate>
      <ReportDetail
        job={job}
        reports={reports}
        findings={findingsResult.findings}
        findingsOk={findingsResult.ok}
        demo={false}
        now={Date.now()}
      />
    </DataScreenGate>
  );
}
