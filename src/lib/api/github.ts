import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import {
  DEMO_AVAILABLE_REPOS,
  DEMO_CONNECTION,
  UNRESOLVED_CONNECTION,
  type AvailableRepo,
  type GithubAccount,
  type GitHubConnection,
  type Repository,
} from '@/lib/dash/github';
import { getApi } from './client';
import { API_ROUTES, COOKIE_NAMES, IS_API_CONFIGURED } from './config';

/**
 * Leituras da conexão GitHub, direto da API Python.
 *
 * Por que aqui e não em `/api/github/*`: o BFF `/api/auth/*` existe por dois
 * motivos que não valem para estas rotas — a API não tem CORS (mas a chamada já
 * é server-side) e o login devolve tokens no corpo (aqui não há cookie novo para
 * gravar). Um route handler só acrescentaria um salto HTTP.
 *
 * As mutações ficam em `github-actions.ts` (Server Actions).
 */

/** O access token vive em cookie httpOnly gravado pelo BFF de auth. */
async function accessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.access)?.value;
}

function isGithubAccount(value: unknown): value is GithubAccount {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as GithubAccount).id === 'string' &&
    typeof (value as GithubAccount).installation_id === 'number'
  );
}

function isRepository(value: unknown): value is Repository {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Repository).id === 'string' &&
    typeof (value as Repository).full_name === 'string' &&
    typeof (value as Repository).active === 'boolean'
  );
}

function isAvailableRepo(value: unknown): value is AvailableRepo {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as AvailableRepo).github_repo_id === 'number' &&
    typeof (value as AvailableRepo).full_name === 'string'
  );
}

/**
 * Estado da conexão para o layout do dashboard.
 *
 * `cache()` do React deduplica dentro da MESMA requisição: o layout e a página
 * podem pedir sem custo dobrado. Não é cache entre requisições — o axios não
 * passa pelo cache de `fetch` do Next, o que é exatamente o desejado para dado
 * por usuário.
 *
 * As duas chamadas vão em paralelo: sequenciá-las somaria latência sem motivo.
 * Qualquer uma falhar deixa a conexão como NÃO resolvida — melhor um estado
 * neutro do que afirmar "nenhuma conta conectada" por causa de um timeout.
 */
export const resolveGitHubConnection = cache(async (): Promise<GitHubConnection> => {
  if (!IS_API_CONFIGURED) return DEMO_CONNECTION;

  const token = await accessToken();
  if (!token) return UNRESOLVED_CONNECTION;

  try {
    const [accountsResponse, reposResponse] = await Promise.all([
      getApi(API_ROUTES.githubAccounts, token),
      getApi(API_ROUTES.repositories, token),
    ]);

    if (
      accountsResponse.status !== 200 ||
      reposResponse.status !== 200 ||
      !Array.isArray(accountsResponse.data) ||
      !Array.isArray(reposResponse.data)
    ) {
      return UNRESOLVED_CONNECTION;
    }

    return {
      demo: false,
      resolved: true,
      accounts: accountsResponse.data.filter(isGithubAccount),
      repositories: reposResponse.data.filter(isRepository),
    };
  } catch {
    // API fora do ar — estado neutro, o dashboard não cai.
    return UNRESOLVED_CONNECTION;
  }
});

/**
 * Repositórios visíveis pelas instalações (`GET /github/repos`).
 *
 * A rota é best-effort do lado da API: uma instalação que falha é ignorada em
 * silêncio, então uma lista curta pode ser lista INCOMPLETA. O front compara a
 * quantidade de owners distintos com a de contas conectadas para avisar o
 * usuário — ver `RepositoriosScreen`.
 */
export async function listAvailableRepos(): Promise<
  { ok: true; repos: AvailableRepo[] } | { ok: false }
> {
  if (!IS_API_CONFIGURED) return { ok: true, repos: DEMO_AVAILABLE_REPOS };

  const token = await accessToken();
  if (!token) return { ok: false };

  try {
    const { status, data } = await getApi(API_ROUTES.githubRepos, token);
    if (status !== 200 || !Array.isArray(data)) return { ok: false };
    return { ok: true, repos: data.filter(isAvailableRepo) };
  } catch {
    return { ok: false };
  }
}
