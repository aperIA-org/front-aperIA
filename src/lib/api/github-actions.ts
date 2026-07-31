'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { deleteApi, getApi, patchApi, postApi } from './client';
import { API_ROUTES, apiDetail, COOKIE_NAMES, IS_API_CONFIGURED } from './config';

/**
 * Mutações da conexão GitHub.
 *
 * São Server Actions e não route handlers: a chamada nasce da UI, não de um
 * cliente externo, e o refresh silencioso continua valendo — uma Server Action
 * posta para a URL da própria página, então o matcher `/dash/:path*` do
 * middleware também cobre estas chamadas e renova o access token expirado antes
 * de a ação rodar.
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

const MSG_SEM_SESSAO = 'Sua sessão expirou. Entre novamente para continuar.';
const MSG_SEM_API = 'Sem back-end configurado: a conexão com o GitHub está em modo demonstração.';
const MSG_REDE = 'Não foi possível falar com o servidor. Tente novamente.';

async function accessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.access)?.value;
}

/** Invalida a árvore inteira do dashboard: a conexão alimenta várias telas. */
function revalidateDash(): void {
  revalidatePath('/dash', 'layout');
}

/**
 * Passo 1 do onboarding: pega a `install_url` e manda o browser para o GitHub.
 *
 * O `state` assinado que a API embute na URL vale 10 minutos, por isso a URL é
 * gerada NO CLIQUE — nunca no render da página, que poderia ficar aberta muito
 * mais tempo que isso.
 */
export async function startGitHubConnect(): Promise<ActionResult> {
  if (!IS_API_CONFIGURED) return { ok: false, message: MSG_SEM_API };

  const token = await accessToken();
  if (!token) return { ok: false, message: MSG_SEM_SESSAO };

  let status: number;
  let data: unknown;
  try {
    ({ status, data } = await getApi(API_ROUTES.githubConnect, token));
  } catch {
    return { ok: false, message: MSG_REDE };
  }

  if (status === 401) return { ok: false, message: MSG_SEM_SESSAO };
  if (status === 503) {
    // GITHUB_APP_SLUG vazio na API: o GitHub App ainda não foi registrado.
    return {
      ok: false,
      message:
        'A integração com o GitHub ainda não está configurada neste ambiente. Fale com quem administra o aperIA.',
    };
  }

  const installUrl =
    data && typeof data === 'object' ? (data as { install_url?: unknown }).install_url : null;

  // Só aceita destino no github.com: a URL vem de fora e vira um redirect do
  // browser — sem esta checagem, uma API mal configurada abriria um open redirect.
  if (typeof installUrl !== 'string' || !installUrl.startsWith('https://github.com/')) {
    return { ok: false, message: apiDetail(data) ?? 'Não foi possível iniciar a conexão.' };
  }

  // Fora do try: `redirect()` sinaliza por exceção e não pode ser engolido.
  redirect(installUrl);
}

/**
 * Salva a seleção de repositórios monitorados.
 *
 * Recebe apenas os `github_repo_id` marcados e reconstrói o diff no servidor,
 * relendo `GET /github/repos` e `GET /repositories`. Duas razões:
 *   1. o cliente não precisa carregar `full_name`/`url`/`github_account_id` de
 *      volta, e nada que ele mande é usado como verdade;
 *   2. `POST /repositories` é upsert em `(user_id, github_repo_id)` e já grava
 *      `active=true`, então ativar e REativar são a mesma chamada — não é preciso
 *      conhecer o `id` da linha.
 *
 * O `id` devolvido pelo POST é deliberadamente ignorado: em reativação a API
 * pode responder com um uuid recém-gerado que não corresponde à linha
 * persistida. Os ids usados no PATCH vêm sempre de `GET /repositories`.
 */
export async function saveMonitoredRepos(selectedRepoIds: number[]): Promise<ActionResult> {
  if (!IS_API_CONFIGURED) return { ok: false, message: MSG_SEM_API };

  const token = await accessToken();
  if (!token) return { ok: false, message: MSG_SEM_SESSAO };

  const selected = new Set(selectedRepoIds);

  try {
    const [availableResponse, currentResponse] = await Promise.all([
      getApi(API_ROUTES.githubRepos, token),
      getApi(API_ROUTES.repositories, token),
    ]);

    if (availableResponse.status === 401 || currentResponse.status === 401) {
      return { ok: false, message: MSG_SEM_SESSAO };
    }
    if (
      availableResponse.status !== 200 ||
      currentResponse.status !== 200 ||
      !Array.isArray(availableResponse.data) ||
      !Array.isArray(currentResponse.data)
    ) {
      return { ok: false, message: 'Não foi possível ler a lista de repositórios.' };
    }

    const available = availableResponse.data as {
      github_account_id: string;
      github_repo_id: number;
      full_name: string;
      url: string;
      default_branch: string;
    }[];
    const current = currentResponse.data as {
      id: string;
      github_repo_id: number;
      active: boolean;
    }[];

    const activeNow = new Set(current.filter((r) => r.active).map((r) => r.github_repo_id));

    const toActivate = available.filter(
      (repo) => selected.has(repo.github_repo_id) && !activeNow.has(repo.github_repo_id),
    );
    const toDeactivate = current.filter(
      (repo) => repo.active && !selected.has(repo.github_repo_id),
    );

    const results = await Promise.all([
      ...toActivate.map((repo) =>
        postApi(
          API_ROUTES.repositories,
          {
            github_account_id: repo.github_account_id,
            github_repo_id: repo.github_repo_id,
            full_name: repo.full_name,
            url: repo.url,
            default_branch: repo.default_branch,
          },
          token,
        ),
      ),
      ...toDeactivate.map((repo) =>
        patchApi(API_ROUTES.repository(repo.id), { active: false }, token),
      ),
    ]);

    const failed = results.filter((result) => result.status >= 400);
    if (failed.length > 0) {
      return {
        ok: false,
        message:
          apiDetail(failed[0].data) ??
          `Não foi possível salvar ${failed.length} de ${results.length} alterações.`,
      };
    }

    revalidateDash();

    if (results.length === 0) return { ok: true };
    return {
      ok: true,
      message: `Seleção salva: ${toActivate.length} ativado(s), ${toDeactivate.length} desativado(s).`,
    };
  } catch {
    return { ok: false, message: MSG_REDE };
  }
}

/**
 * Desconecta uma instalação do GitHub App.
 *
 * A API remove, na mesma transação, os repositórios vinculados à conta — sem
 * isso eles ficariam listados como ativos em `GET /repositories` sem instalação
 * que os enxergasse. Findings e scans já coletados permanecem.
 */
export async function disconnectGitHubAccount(accountId: string): Promise<ActionResult> {
  if (!IS_API_CONFIGURED) return { ok: false, message: MSG_SEM_API };

  const token = await accessToken();
  if (!token) return { ok: false, message: MSG_SEM_SESSAO };

  try {
    const { status, data } = await deleteApi(API_ROUTES.githubAccount(accountId), token);

    if (status === 401) return { ok: false, message: MSG_SEM_SESSAO };
    if (status === 404) return { ok: false, message: 'Esta conta já não está conectada.' };
    if (status !== 204 && status !== 200) {
      return { ok: false, message: apiDetail(data) ?? 'Não foi possível desconectar a conta.' };
    }

    revalidateDash();
    return { ok: true, message: 'Conta desconectada.' };
  } catch {
    return { ok: false, message: MSG_REDE };
  }
}

/**
 * Dispara um scan manual no HEAD do branch default do repositório.
 *
 * Fora daqui, um scan só nasce de um pull request (webhook). É por isso que a
 * tela de Scans oferece o botão: sem PR aberto não haveria nada para mostrar.
 */
export async function requestManualScan(
  repositoryId: string,
): Promise<ActionResult & { commitSha?: string }> {
  if (!IS_API_CONFIGURED) return { ok: false, message: MSG_SEM_API };

  const token = await accessToken();
  if (!token) return { ok: false, message: MSG_SEM_SESSAO };

  try {
    const { status, data } = await postApi(API_ROUTES.repositoryScan(repositoryId), {}, token);

    if (status === 401) return { ok: false, message: MSG_SEM_SESSAO };
    if (status === 404) return { ok: false, message: 'Repositório não encontrado.' };
    if (status === 409) {
      return {
        ok: false,
        message: apiDetail(data) ?? 'Já existe um scan em andamento para este commit.',
      };
    }
    if (status === 503) {
      return {
        ok: false,
        message: 'A integração com o GitHub não está configurada neste ambiente.',
      };
    }
    if (status === 502) {
      // A API não conseguiu resolver o HEAD do branch default no GitHub.
      return {
        ok: false,
        message:
          apiDetail(data) ??
          'Não foi possível ler o branch default no GitHub. Verifique se o App ainda tem acesso ao repositório.',
      };
    }
    if (status < 200 || status >= 300) {
      return { ok: false, message: apiDetail(data) ?? 'Não foi possível iniciar o scan.' };
    }

    const commitSha =
      data && typeof data === 'object'
        ? (data as { commit_sha?: unknown }).commit_sha
        : undefined;

    revalidateDash();
    return {
      ok: true,
      message: 'Scan enfileirado.',
      commitSha: typeof commitSha === 'string' ? commitSha : undefined,
    };
  } catch {
    return { ok: false, message: MSG_REDE };
  }
}
