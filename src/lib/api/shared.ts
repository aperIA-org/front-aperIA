/**
 * Constantes compartilhadas entre o BFF e o middleware.
 *
 * Este módulo NÃO importa `server-only` de propósito: o middleware roda em
 * outro bundle (Edge) e não pode importar módulos marcados como server-only.
 * Aqui só existem constantes — nada de URL de API nem de token.
 */

export const COOKIE_NAMES = {
  access: 'aperia_access',
  refresh: 'aperia_refresh',
} as const;

/** Espelham ACCESS_TOKEN_EXPIRE_MINUTES / REFRESH_TOKEN_EXPIRE_DAYS da API. */
export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export const API_ROUTES = {
  createUser: '/users',
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',

  // Conexão GitHub. Ficam aqui, junto das de auth, para existir um único
  // vocabulário de caminhos da API — nenhuma tela monta path na mão.
  githubConnect: '/github/connect',
  githubRepos: '/github/repos',
  githubAccounts: '/github/accounts',
  githubAccount: (accountId: string) => `/github/accounts/${accountId}`,
  repositories: '/repositories',
  repository: (repositoryId: string) => `/repositories/${repositoryId}`,
  repositoryScan: (repositoryId: string) => `/repositories/${repositoryId}/scan`,
} as const;

/**
 * `httpOnly` mantém os tokens fora do alcance de JavaScript; `sameSite: 'lax'`
 * barra envio cross-site sem quebrar navegação por link; `secure` só em
 * produção, senão o cookie não gruda em http://localhost.
 */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
};

export function isTokenPair(data: unknown): data is TokenPair {
  return (
    !!data &&
    typeof data === 'object' &&
    typeof (data as TokenPair).access_token === 'string' &&
    typeof (data as TokenPair).refresh_token === 'string'
  );
}
