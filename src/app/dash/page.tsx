import { DashHomeScreen } from '@/components/dash/DashHomeScreen';
import { fetchFindingGroups } from '@/lib/api/findings';
import { resolveGitHubConnection } from '@/lib/api/github';
import { fetchScans } from '@/lib/api/scans';
import { contarSeveridades, groupFindings } from '@/lib/dash/findings-groups';
import { openFindings, REF_NOW, SCAN_JOBS } from '@/lib/dash/mock-data';

/**
 * Server component: os KPIs vêm de `GET /findings/groups` e `GET /scans`.
 *
 * As duas buscas são independentes e vão em paralelo. Com os mesmos módulos que
 * alimentam Findings e Scans, os números da home passam a bater com os das
 * telas — antes a home contava o dataset do protótipo e divergia.
 *
 * Os findings vêm AGRUPADOS, não pela listagem plana: `fetchFindings` para em
 * 1000 (5 páginas de 200), e com DAST ligado um scan sozinho grava ~12 mil.
 * Os KPIs travavam nesse teto. Agregado, o conjunto inteiro cabe em UMA
 * requisição e cada grupo já traz quantas vezes o problema aparece.
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
        counts={contarSeveridades(groupFindings(openFindings()))}
        total={openFindings().length}
        truncated={false}
        jobs={SCAN_JOBS}
        findingsOk
        scansOk
        demo
        now={REF_NOW}
      />
    );
  }

  const [groupsResult, scansResult] = await Promise.all([fetchFindingGroups(), fetchScans()]);

  return (
    <DashHomeScreen
      counts={contarSeveridades(groupsResult.groups)}
      total={groupsResult.totalFindings}
      truncated={groupsResult.truncated}
      jobs={scansResult.jobs}
      findingsOk={groupsResult.ok}
      scansOk={scansResult.ok}
      demo={false}
      now={Date.now()}
    />
  );
}
