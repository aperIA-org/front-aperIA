'use client';

/**
 * Chaves de localStorage herdadas do dashboard estático. Os nomes foram
 * mantidos exatamente iguais para que uma sessão existente continue válida
 * depois do port.
 */
export const STORAGE_KEYS = {
  /** 'light' | 'dark' — tema escolhido pelo usuário. */
  theme: 'aperia-theme',
  /** 'true' quando a sidebar está colapsada. */
  sidebarCollapsed: 'aperia-sb-col',
} as const;

/**
 * Chaves que já não existem mais, apagadas no logout e em um novo login.
 *
 * A conexão GitHub deixou de ser simulada: `connected`, `monitored` e a data de
 * instalação agora vêm da API (`/github/accounts` + `/repositories`), resolvidos
 * no servidor. `aperia-screen` era do dashboard estático, que guardava a tela
 * atual — aqui as telas são rotas. Continuam nesta lista para limpar o
 * localStorage de quem usou uma versão anterior; podem sair quando não houver
 * mais sessões antigas em circulação.
 */
export const SESSION_SCOPED_KEYS = [
  'aperia-connected',
  'aperia-screen',
  'aperia-monitored',
  'aperia-gh-installed',
] as const;

/** localStorage nunca deve derrubar a renderização (Safari privado, SSR, iframe). */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota cheia ou acesso bloqueado — segue sem persistir */
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* idem */
  }
}

/** Descarta resíduos de versões anteriores — no logout e ao entrar após autenticar. */
export function clearSessionState(): void {
  for (const key of SESSION_SCOPED_KEYS) removeStorage(key);
}
