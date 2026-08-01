import { Suspense } from 'react';
import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { FindingsScreen } from '@/components/dash/FindingsScreen';
import { fetchFindings } from '@/lib/api/findings';
import { resolveGitHubConnection } from '@/lib/api/github';
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

  const data = demo
    ? { findings: FINDINGS, truncated: false, ok: true }
    : await fetchFindings();

  return (
    <DataScreenGate>
      {/* FindingsScreen usa useSearchParams (os filtros vivem na URL). */}
      <Suspense fallback={null}>
        <FindingsScreen
          findings={data.findings}
          demo={demo}
          apiOk={data.ok}
          truncated={data.truncated}
          now={demo ? REF_NOW : Date.now()}
        />
      </Suspense>
    </DataScreenGate>
  );
}
