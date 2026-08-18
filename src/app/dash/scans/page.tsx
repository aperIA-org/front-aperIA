import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { ScansScreen } from '@/components/dash/ScansScreen';
import { resolveGitHubConnection } from '@/lib/api/github';
import { fetchScans, fetchScanTools } from '@/lib/api/scans';
import { scanRanAt } from '@/lib/dash/format';
import { REF_NOW, SCAN_JOBS } from '@/lib/dash/mock-data';
import type { ScanIaSummary, ToolRunDto } from '@/lib/dash/pipeline-tools';
import type { ScanJob } from '@/lib/dash/types';

/**
 * Quantas execuções têm o status por ferramenta buscado.
 *
 * `GET /scans/{id}/tools` é uma requisição por execução, e a lista pode trazer
 * 200 — buscar todas seria absurdo. O teto cobre com folga o que a tela mostra
 * ao abrir: um card por repositório, o mais recente de cada. Os cards que só
 * aparecem ao expandir o histórico caem para o status do tier, e a faixa diz
 * qual dos dois modos está mostrando.
 */
const MAX_TOOL_LOOKUPS = 12;

/** A execução mais recente de cada repositório — exatamente o que renderiza colapsado. */
function latestPerRepo(jobs: ScanJob[]): ScanJob[] {
  const byRepo = new Map<string, ScanJob>();
  jobs.forEach((job) => {
    const atual = byRepo.get(job.repo_full_name);
    if (!atual || Date.parse(scanRanAt(job)) > Date.parse(scanRanAt(atual))) {
      byRepo.set(job.repo_full_name, job);
    }
  });
  return [...byRepo.values()];
}

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

  // Em paralelo, e só para o que a tela mostra de cara. Uma execução sem
  // resposta simplesmente não entra no mapa — a faixa cai para o status do
  // tier, que é o comportamento correto e não um erro a reportar.
  const toolRuns: Record<string, ToolRunDto[]> = {};
  const iaByScan: Record<string, ScanIaSummary | null> = {};
  if (!demo) {
    const alvos = latestPerRepo(data.jobs).slice(0, MAX_TOOL_LOOKUPS);
    const resultados = await Promise.all(
      alvos.map(async (job) => [job.id, await fetchScanTools(job.id)] as const),
    );
    resultados.forEach(([id, resultado]) => {
      if (!resultado.ok) return;
      if (resultado.tools.length > 0) toolRuns[id] = resultado.tools;
      // Uma requisição só traz ferramentas E o resumo da I.A — foi por isso que
      // o `ia` entrou nesta rota em vez de ganhar uma própria.
      if (resultado.ia) iaByScan[id] = resultado.ia;
    });
  }

  return (
    <DataScreenGate>
      <ScansScreen
        jobs={data.jobs}
        ok={data.ok}
        demo={demo}
        now={demo ? REF_NOW : Date.now()}
        toolRuns={toolRuns}
        iaByScan={iaByScan}
      />
    </DataScreenGate>
  );
}
