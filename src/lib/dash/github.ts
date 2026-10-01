/**
 * Contrato da conexão GitHub — tipos e helpers puros.
 *
 * Este módulo NÃO é server-only de propósito: o provider de estado do dashboard
 * é um client component e precisa dos mesmos tipos. As chamadas à API ficam em
 * `src/lib/api/github.ts` (server-only) e em `github-actions.ts`.
 *
 * Os nomes de campo são os da API Python (snake_case) sem tradução: são DTOs de
 * fronteira, e renomear aqui só criaria um segundo vocabulário para manter.
 */

import {
  DEFAULT_GH_INSTALLED_AT,
  DEFAULT_MONITORED,
  GH_ORG,
  INSTALLATION_REPOS,
} from './mock-data';

/** `GithubAccountResponse` — uma instalação do GitHub App vinculada ao usuário. */
export type GithubAccount = {
  id: string;
  installation_id: number;
  github_login: string | null;
  /** "User" | "Organization" — a API não restringe além de string. */
  account_type: string | null;
  created_at: string;
};

/**
 * `AvailableRepo` — repositório que a instalação enxerga, listado ao vivo por
 * `GET /github/repos`. `private`/`language`/`pushed_at` alimentam a linha de
 * metadados do seletor.
 */
export type AvailableRepo = {
  github_account_id: string;
  github_repo_id: number;
  full_name: string;
  url: string;
  default_branch: string;
  active: boolean;
  private: boolean;
  language: string | null;
  pushed_at: string | null;
};

/** `RepositoryResponse` — repositório ativado para análise (linha no banco). */
export type Repository = {
  id: string;
  github_account_id: string;
  installation_id: number;
  github_repo_id: number;
  full_name: string;
  url: string | null;
  default_branch: string;
  active: boolean;
  created_at: string;
  /**
   * URL da aplicação publicada (staging/preview) — alvo do DAST no Tier 3.
   *
   * Sempre presente na resposta da API; `null` quando não há alvo, e é o Tier 3
   * que registra `reason="no_target_url"` nesse caso. Não confundir com `url`,
   * que é o endereço do repositório no GitHub.
   */
  target_url: string | null;
};

/**
 * Estado da conexão, resolvido no servidor e passado ao provider.
 *
 * `resolved: false` significa "a API está configurada mas não respondeu ou não
 * havia sessão" — diferente de "respondeu que não há nenhuma conta". A UI
 * precisa dessa distinção para não pedir ao usuário que conecte o GitHub quando
 * o problema é outro.
 */
export type GitHubConnection = {
  /** Dados mock: sem `APERIA_API_URL` ou dentro do preview do cadastro. */
  demo: boolean;
  resolved: boolean;
  accounts: GithubAccount[];
  repositories: Repository[];
};

/** ≥1 instalação vinculada — é o que libera as telas de dados. */
export function isConnected(connection: GitHubConnection): boolean {
  return connection.accounts.length > 0;
}

/** Repositórios que o pipeline realmente analisa. */
export function monitoredRepos(connection: GitHubConnection): Repository[] {
  return connection.repositories.filter((repo) => repo.active);
}

/**
 * O endereço web do repositório, a partir do que o banco guarda.
 *
 * `repo_url` vem do que foi cadastrado e é inconsistente: uns registros têm o
 * sufixo `.git` (a URL de clone), outros não. Concatenar `/pull/21` direto
 * produzia `…/python-api.git/pull/21`, que o GitHub não resolve — o link
 * abria uma 404 sem nada indicar o motivo.
 *
 * Normalizar na leitura, e não no banco, porque a mesma coluna alimenta coisas
 * que não são link; e uma migration não impediria o próximo cadastro de
 * entrar com `.git` de novo.
 */
export function repoWebUrl(repoUrl: string): string {
  return repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
}

/** "OCR-aperIA/payments-api" → "payments-api". */
export function repoShortName(fullName: string): string {
  const slash = fullName.indexOf('/');
  return slash === -1 ? fullName : fullName.slice(slash + 1);
}

/** "OCR-aperIA/payments-api" → "OCR-aperIA". */
export function repoOwner(fullName: string): string {
  const slash = fullName.indexOf('/');
  return slash === -1 ? '' : fullName.slice(0, slash);
}

/**
 * Página de configuração da instalação no GitHub.
 *
 * Quando a instalação não expõe nenhum repositório, o único conserto é lá — e a
 * API não devolve essa URL, então ela é montada aqui a partir do
 * `installation_id`. O caminho difere entre conta pessoal e organização.
 */
export function installationSettingsUrl(account: GithubAccount): string {
  if (account.account_type === 'Organization' && account.github_login) {
    return `https://github.com/organizations/${account.github_login}/settings/installations/${account.installation_id}`;
  }
  return `https://github.com/settings/installations/${account.installation_id}`;
}

/** Rótulo da conta para a UI — `github_login` é nullable no schema da API. */
export function accountLabel(account: GithubAccount): string {
  return account.github_login ?? `instalação ${account.installation_id}`;
}

/**
 * Agrupa por dono para o seletor: com mais de uma instalação (pessoal + orgs) a
 * lista chega achatada de `GET /github/repos` e misturaria owners diferentes.
 */
export function groupReposByOwner(
  repos: readonly AvailableRepo[],
): { owner: string; repos: AvailableRepo[] }[] {
  const groups = new Map<string, AvailableRepo[]>();
  for (const repo of repos) {
    const owner = repoOwner(repo.full_name) || '—';
    const list = groups.get(owner);
    if (list) list.push(repo);
    else groups.set(owner, [repo]);
  }
  return [...groups.entries()]
    .map(([owner, list]) => ({ owner, repos: list }))
    .sort((a, b) => a.owner.localeCompare(b.owner));
}

// ── Modo demonstração / preview ──────────────────────────────────────────────
//
// Sem back-end (e dentro do iframe do cadastro) o dashboard continua navegável
// com os dados do protótipo. As datas são fixas: `REF_NOW` está congelado e
// `Date.now()` quebraria a hidratação — ver CLAUDE.md.

const DEMO_ACCOUNT_ID = 'demo-account';

export const DEMO_ACCOUNT: GithubAccount = {
  id: DEMO_ACCOUNT_ID,
  installation_id: 0,
  github_login: GH_ORG,
  account_type: 'Organization',
  created_at: DEFAULT_GH_INSTALLED_AT,
};

// `github_repo_id` sintético e estável (índice + 1): é a chave que o seletor usa
// para casar disponíveis × ativados, então repetir o mesmo valor colapsaria a
// seleção inteira em uma única linha.
export const DEMO_AVAILABLE_REPOS: AvailableRepo[] = INSTALLATION_REPOS.map((repo, index) => ({
  github_account_id: DEMO_ACCOUNT_ID,
  github_repo_id: index + 1,
  full_name: `${GH_ORG}/${repo.name}`,
  url: `https://github.com/${GH_ORG}/${repo.name}`,
  default_branch: 'main',
  active: DEFAULT_MONITORED.includes(repo.name),
  private: repo.private,
  language: repo.lang,
  pushed_at: repo.last_push,
}));

export const DEMO_REPOSITORIES: Repository[] = INSTALLATION_REPOS.map((repo, index) => ({
  target_url: null,
  id: `demo-${repo.name}`,
  github_account_id: DEMO_ACCOUNT_ID,
  installation_id: 0,
  github_repo_id: index + 1,
  full_name: `${GH_ORG}/${repo.name}`,
  url: `https://github.com/${GH_ORG}/${repo.name}`,
  default_branch: 'main',
  active: DEFAULT_MONITORED.includes(repo.name),
  created_at: DEMO_ACCOUNT.created_at,
})).filter((repo) => repo.active);

export const DEMO_CONNECTION: GitHubConnection = {
  demo: true,
  resolved: true,
  accounts: [DEMO_ACCOUNT],
  repositories: DEMO_REPOSITORIES,
};

/** Conexão vazia — API configurada, mas sem sessão ou sem resposta. */
export const UNRESOLVED_CONNECTION: GitHubConnection = {
  demo: false,
  resolved: false,
  accounts: [],
  repositories: [],
};
