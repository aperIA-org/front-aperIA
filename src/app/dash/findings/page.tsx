import { Suspense } from 'react';
import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { FindingsScreen } from '@/components/dash/FindingsScreen';
import { fetchFindingGroups, fetchFindings } from '@/lib/api/findings';
import { resolveGitHubConnection } from '@/lib/api/github';
import { parseFilters } from '@/lib/dash/findings-filters';
import { groupFindings } from '@/lib/dash/findings-groups';
import { FINDINGS, REF_NOW } from '@/lib/dash/mock-data';

/**
 * Server component: os findings vêm da API com o access token em cookie
 * httpOnly, que o browser não consegue ler.
 *
 * Diferente do layout, uma página recebe `searchParams`, e é por isso que o
 * `?preview=1` é tratado aqui: o carrossel do cadastro roda em iframe sem
 * sessão e não pode chamar a API.
 *
 * `now` desce como prop porque o relógio da tela depende da origem do dado —
 * `REF_NOW` congelado no dataset do protótipo, o agora real com a API. Calcular
 * no cliente divergiria do HTML do servidor e quebraria a hidratação.
 *
 * A VISÃO também é resolvida aqui, e não só no cliente: cada uma pede um
 * endpoint diferente. Agrupado busca `/findings/groups` (~14 linhas); "Todos"
 * busca a lista plana, com `?title=` quando é o drill-down de um grupo. Buscar
 * as duas coisas sempre significaria varrer até 1000 findings para renderizar
 * uma tabela de 14 linhas.
 */
export default async function FindingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  // O `||` curto-circuita: em preview a conexão nem é consultada.
  const demo = first(params.preview) === '1' || (await resolveGitHubConnection()).demo;
  const now = demo ? REF_NOW : Date.now();

  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    const unico = first(valor);
    if (unico !== undefined) query.set(chave, unico);
  }
  const filters = parseFilters(query, now);
  // `?finding=` aponta para uma linha da lista plana — mesma regra da tela.
  const agrupado = filters.vis === 'grupos' && !first(params.finding);

  if (demo) {
    /**
     * Em demonstração o agrupamento roda no cliente sobre o dataset do
     * protótipo: ele não passa pela API. O corte aberto/resolvido não existe
     * em grupo (a API não modela resolução), então agrupa-se o que a visão
     * plana mostra por padrão — os abertos.
     */
    const abertos = FINDINGS.filter((f) => f.status !== 'resolved');
    const groups = groupFindings(abertos);
    return (
      <DataScreenGate>
        <Suspense fallback={null}>
          <FindingsScreen
            findings={FINDINGS}
            groups={groups}
            groupsTotal={abertos.length}
            demo
            apiOk
            truncated={false}
            now={now}
          />
        </Suspense>
      </DataScreenGate>
    );
  }

  if (agrupado) {
    const data = await fetchFindingGroups();
    return (
      <DataScreenGate>
        <Suspense fallback={null}>
          <FindingsScreen
            findings={[]}
            groups={data.groups}
            groupsTotal={data.totalFindings}
            demo={false}
            apiOk={data.ok}
            truncated={data.truncated}
            now={now}
          />
        </Suspense>
      </DataScreenGate>
    );
  }

  // Visão plana. `titulo` vai como `?title=` para a API: sem isso, o
  // drill-down de um grupo com 3 mil ocorrências seria cortado pelo teto ao
  // varrer o conjunto inteiro.
  const data = await fetchFindings(undefined, filters.titulo ?? undefined);

  return (
    <DataScreenGate>
      {/* FindingsScreen usa useSearchParams (os filtros vivem na URL). */}
      <Suspense fallback={null}>
        <FindingsScreen
          findings={data.findings}
          groups={[]}
          groupsTotal={0}
          demo={false}
          apiOk={data.ok}
          truncated={data.truncated}
          now={now}
        />
      </Suspense>
    </DataScreenGate>
  );
}
