import { RepositoriosScreen } from '@/components/dash/RepositoriosScreen';
import { listAvailableRepos, resolveGitHubConnection } from '@/lib/api/github';
import { DEMO_AVAILABLE_REPOS, DEMO_CONNECTION } from '@/lib/dash/github';

/**
 * Server component: a conexão e a lista ao vivo de repositórios são resolvidas
 * aqui, com o access token que vive em cookie httpOnly — o browser não teria
 * como fazer estas buscas.
 *
 * Diferente do layout, uma página recebe `searchParams`, e é por isso que o
 * `?preview=1` é tratado neste nível: o carrossel do cadastro roda em iframe sem
 * sessão e não pode chamar a API.
 */
export default async function RepositoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  if (first(params.preview) === '1') {
    return (
      <RepositoriosScreen
        connection={DEMO_CONNECTION}
        available={DEMO_AVAILABLE_REPOS}
        availableFailed={false}
      />
    );
  }

  const [connection, available] = await Promise.all([
    resolveGitHubConnection(),
    listAvailableRepos(),
  ]);

  return (
    <RepositoriosScreen
      connection={connection}
      available={available.ok ? available.repos : []}
      availableFailed={!available.ok}
      callbackStatus={first(params.github)}
      callbackReason={first(params.motivo)}
    />
  );
}
