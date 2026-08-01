import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { ReportsListScreen } from '@/components/dash/ReportsListScreen';
import { resolveGitHubConnection } from '@/lib/api/github';
import { fetchScans } from '@/lib/api/scans';
import { REF_NOW, SCAN_JOBS } from '@/lib/dash/mock-data';

/**
 * Server component: as execuções vêm de `GET /scans` com o access token em
 * cookie httpOnly, que o browser não consegue ler.
 *
 * `now` desce como prop porque o relógio depende da origem do dado — `REF_NOW`
 * congelado no dataset do protótipo, o agora real com a API. Calcular no
 * cliente divergiria do HTML do servidor e quebraria a hidratação.
 */
export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const preview = Array.isArray(params.preview) ? params.preview[0] : params.preview;

  // O `||` curto-circuita: em preview a conexão nem é consultada.
  const demo = preview === '1' || (await resolveGitHubConnection()).demo;

  const data = demo
    ? { jobs: SCAN_JOBS, ok: true }
    : await fetchScans();

  return (
    <DataScreenGate>
      <ReportsListScreen
        jobs={data.jobs}
        ok={data.ok}
        now={demo ? REF_NOW : Date.now()}
      />
    </DataScreenGate>
  );
}
