import { Suspense } from 'react';
import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { RemediationsScreen } from '@/components/dash/RemediationsScreen';
import { resolveGitHubConnection } from '@/lib/api/github';
import { fetchRemediations } from '@/lib/api/remediations';
import { fetchScan } from '@/lib/api/scans';
import { FINDINGS, REF_NOW, REMEDIATIONS, SCAN_JOBS } from '@/lib/dash/mock-data';
import type { RemediationItem, ScanJob } from '@/lib/dash/types';

/**
 * Server component: as remediações vêm de `GET /remediations`, com o access
 * token em cookie httpOnly que o browser não consegue ler.
 *
 * O `?scan=` — contrato com a tela de Scans — passou a ser resolvido AQUI, e
 * vai para a API como `scan_job_id` em vez de filtrar uma lista já baixada.
 *
 * `now` desce como prop pela mesma razão das outras telas: o relógio depende
 * da origem do dado (`REF_NOW` congelado no protótipo, o agora real com a
 * API), e calcular no cliente divergiria do HTML do servidor.
 */

/** No protótipo o contexto do card saía de `FINDINGS`/`SCAN_JOBS`. */
function comContextoDoMock(): RemediationItem[] {
  return REMEDIATIONS.map((rem) => {
    const finding = FINDINGS.find((f) => f.id === rem.finding_id);
    const job = SCAN_JOBS.find((j) => j.id === rem.scan_job_id);
    return {
      ...rem,
      finding: finding && {
        id: finding.id,
        title: finding.title,
        severity: finding.severity,
        file_path: finding.file_path,
        repo_url: finding.repo_url,
      },
      job: job && { pr_number: job.pr_number },
      // O dataset do protótipo é anterior ao conceito de destino: ele nunca
      // modelou o comentário no PR. Todos entram como sugestão aberta, que é
      // o que o protótipo representava.
      destino: {
        tipo: 'suggestion' as const,
        commentUrl: job?.pr_number
          ? `${finding?.repo_url ?? ''}/pull/${job.pr_number}`
          : '',
      },
    };
  });
}

export default async function RemediacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  // O `||` curto-circuita: em preview a conexão nem é consultada.
  const demo = first(params.preview) === '1' || (await resolveGitHubConnection()).demo;
  const scanId = first(params.scan);

  if (demo) {
    const todas = comContextoDoMock();
    const job = scanId ? SCAN_JOBS.find((j) => j.id === scanId) : undefined;
    return (
      <DataScreenGate>
        <Suspense fallback={null}>
          <RemediationsScreen
            remediations={job ? todas.filter((r) => r.scan_job_id === job.id) : todas}
            scopeJob={job ?? null}
            ok
            now={REF_NOW}
          />
        </Suspense>
      </DataScreenGate>
    );
  }

  // A faixa de contexto mostra repositório, PR, commit e quando o scan rodou —
  // só o último não vem embutido na remediação, daí a busca extra, feita
  // apenas quando há escopo.
  const [data, scopeJob] = await Promise.all([
    fetchRemediations(scanId),
    scanId ? fetchScan(scanId) : Promise.resolve<ScanJob | null>(null),
  ]);

  return (
    <DataScreenGate>
      {/* RemediationsScreen usa useSearchParams (`?rem=` é o destaque). */}
      <Suspense fallback={null}>
        <RemediationsScreen
          remediations={data.remediations}
          scopeJob={scopeJob}
          ok={data.ok}
          now={Date.now()}
        />
      </Suspense>
    </DataScreenGate>
  );
}
