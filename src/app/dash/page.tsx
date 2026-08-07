import { DashHomeScreen } from '@/components/dash/DashHomeScreen';
import { fetchFindings } from '@/lib/api/findings';
import { resolveGitHubConnection } from '@/lib/api/github';
import { fetchScans } from '@/lib/api/scans';
import { openFindings, REF_NOW, SCAN_JOBS } from '@/lib/dash/mock-data';

/**
 * Server component: os KPIs vêm de `GET /findings` e `GET /scans`.
 *
 * As duas buscas são independentes e vão em paralelo. Com os mesmos módulos que
 * alimentam Findings e Scans, os números da home passam a bater com os das
 * telas — antes a home contava o dataset do protótipo e divergia.
 */
export default async function DashHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const preview = Array.isArray(params.preview) ? params.preview[0] : params.preview;

  // O `||` curto-circuita: em preview a conexão nem é consultada.
  const demo = preview === '1' || (await resolveGitHubConnection()).demo;

  if (demo) {
    return (
      <DashHomeScreen
        findings={openFindings()}
        jobs={SCAN_JOBS}
        findingsOk
        scansOk
        demo
        now={REF_NOW}
      />
    );
  }

  const [findingsResult, scansResult] = await Promise.all([fetchFindings(), fetchScans()]);

  return (
    <DashHomeScreen
      findings={findingsResult.findings}
      jobs={scansResult.jobs}
      findingsOk={findingsResult.ok}
      scansOk={scansResult.ok}
      demo={false}
      now={Date.now()}
    />
  );
}
