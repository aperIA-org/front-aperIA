'use client';

/**
 * Chaves de localStorage herdadas do dashboard estático. Os nomes foram
 * mantidos exatamente iguais para que uma sessão existente continue válida
 * depois do port.
 */
export const STORAGE_KEYS = {
  /** 'light' | 'dark' — tema escolhido pelo usuário. */
  theme: 'aperia-theme',
  /** 'true' quando o onboarding do GitHub foi concluído. */
  connected: 'aperia-connected',
  /** Último screen visitado (o port usa rotas reais; mantido p/ compatibilidade). */
  screen: 'aperia-screen',
  /** JSON: array com os nomes dos repositórios monitorados. */
  monitored: 'aperia-monitored',
  /** ISO date da instalação simulada do GitHub App. */
  ghInstalled: 'aperia-gh-installed',
  /** 'true' quando a sidebar está colapsada. */
  sidebarCollapsed: 'aperia-sb-col',
} as const;

/** Chaves limpas no logout / em um novo login (dash sempre abre zerado). */
export const SESSION_SCOPED_KEYS = [
  STORAGE_KEYS.connected,
  STORAGE_KEYS.screen,
  STORAGE_KEYS.monitored,
  STORAGE_KEYS.ghInstalled,
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

export function readJsonStorage<T>(key: string, fallback: T): T {
  const raw = readStorage(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Zera o estado de sessão — usado no logout e ao entrar após autenticar. */
export function clearSessionState(): void {
  for (const key of SESSION_SCOPED_KEYS) removeStorage(key);
}
