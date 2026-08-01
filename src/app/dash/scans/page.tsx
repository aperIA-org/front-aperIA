import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { ScansScreen } from '@/components/dash/ScansScreen';
import { resolveGitHubConnection } from '@/lib/api/github';
import { fetchScans } from '@/lib/api/scans';
import { REF_NOW, SCAN_JOBS } from '@/lib/dash/mock-data';

/**
 * Server component: as execuções vêm de `GET /scans` — a mesma fonte da lista
 * de Relatórios, com o access token em cookie httpOnly.
 *
 * Depois de um scan manual a Server Action revalida `/dash`, então a execução
 * nova aparece aqui sem recarregar à mão.
 */
export default async function ScansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const preview = Array.isArray(params.preview) ? params.preview[0] : params.preview;

  // O `||` curto-circuita: em preview a conexão nem é consultada.
  const demo = preview === '1' || (await resolveGitHubConnection()).demo;

  const data = demo ? { jobs: SCAN_JOBS, ok: true } : await fetchScans();

  return (
    <DataScreenGate>
      <ScansScreen
        jobs={data.jobs}
        ok={data.ok}
        demo={demo}
        now={demo ? REF_NOW : Date.now()}
      />
    </DataScreenGate>
  );
}
