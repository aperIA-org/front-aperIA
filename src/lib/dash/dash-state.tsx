'use client';

import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AUTH_CONFIG } from '@/lib/auth-config';
import {
  clearSessionState,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from '@/lib/storage';
import {
  DEMO_CONNECTION,
  isConnected,
  monitoredRepos,
  type GitHubConnection,
  type Repository,
} from './github';

export type Theme = 'dark' | 'light';

type DashState = {
  /**
   * `false` até o primeiro efeito rodar. Vale APENAS para tema e sidebar, que
   * seguem em localStorage — o estado da conexão vem do servidor e já está
   * disponível no primeiro render.
   */
  mounted: boolean;
  /** `?preview=1`: força a conexão mock e suprime TODA escrita em localStorage. */
  isPreview: boolean;

  /** Conexão GitHub resolvida no servidor (ou mock em preview/demonstração). */
  connection: GitHubConnection;
  /** ≥1 instalação do GitHub App vinculada. */
  connected: boolean;
  /** Repositórios com `active=true` — os que o pipeline analisa. */
  monitored: Repository[];
  /**
   * As telas de Findings/Scans/Relatórios/Remediações/Emulação ainda mostram o
   * dataset do protótipo. Quando a conexão é real, isso precisa estar explícito
   * na tela — em modo demonstração o app inteiro já é protótipo e o aviso seria
   * ruído.
   */
  showDemoBadge: boolean;

  sidebarCollapsed: boolean;
  theme: Theme;

  toggleSidebar: () => void;
  toggleTheme: () => void;
  logout: () => void;
};

const DashStateContext = createContext<DashState | null>(null);

export function DashStateProvider({
  children,
  initialConnection,
}: {
  children: React.ReactNode;
  /** Resolvida em `src/app/dash/layout.tsx` (server component). */
  initialConnection: GitHubConnection;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  /**
   * O carrossel do cadastro roda em iframe e não pode chamar a API, então o
   * preview usa a conexão mock. Calculado no render (não em efeito) porque esta
   * rota já é dinâmica — `useSearchParams` devolve o mesmo valor no SSR e na
   * hidratação, sem flash de onboarding nem mismatch.
   */
  const connection = isPreview ? DEMO_CONNECTION : initialConnection;

  /** Em preview nada é persistido — o preview não pode sujar o estado real. */
  const persist = useCallback(
    (key: string, value: string) => {
      if (!isPreview) writeStorage(key, value);
    },
    [isPreview],
  );

  // Hidratação de tema e sidebar: o resto do estado vem do servidor.
  useEffect(() => {
    const themeParam = searchParams.get('theme');
    const storedTheme = readStorage(STORAGE_KEYS.theme);
    const nextTheme: Theme =
      themeParam === 'light' || themeParam === 'dark'
        ? themeParam
        : storedTheme === 'light'
          ? 'light'
          : storedTheme === 'dark'
            ? 'dark'
            : window.matchMedia('(prefers-color-scheme: light)').matches
              ? 'light'
              : 'dark';

    setTheme(nextTheme);
    setSidebarCollapsed(readStorage(STORAGE_KEYS.sidebarCollapsed) === 'true');
    setMounted(true);
  }, [searchParams]);

  // O atributo no <html> é o que dirige todos os tokens de tema.
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
  }, [theme, mounted]);

  const value = useMemo<DashState>(
    () => ({
      mounted,
      isPreview,
      connection,
      connected: isConnected(connection),
      monitored: monitoredRepos(connection),
      showDemoBadge: !connection.demo,
      sidebarCollapsed,
      theme,

      toggleSidebar: () => {
        setSidebarCollapsed((prev) => {
          persist(STORAGE_KEYS.sidebarCollapsed, String(!prev));
          return !prev;
        });
      },

      toggleTheme: () => {
        setTheme((prev) => {
          const next: Theme = prev === 'light' ? 'dark' : 'light';
          persist(STORAGE_KEYS.theme, next);
          return next;
        });
      },

      logout: () => {
        if (isPreview) return;
        clearSessionState();
        // Revoga o refresh_token e limpa os cookies httpOnly no servidor.
        // Navega de qualquer forma: uma falha de rede não pode prender o
        // usuário numa sessão que ele já pediu para encerrar.
        void axios
          .post(AUTH_CONFIG.LOGOUT_ENDPOINT, null, { validateStatus: () => true })
          .catch(() => undefined)
          .finally(() => router.push('/login'));
      },
    }),
    [mounted, isPreview, connection, sidebarCollapsed, theme, persist, router],
  );

  return (
    <DashStateContext.Provider value={value}>{children}</DashStateContext.Provider>
  );
}

export function useDashState(): DashState {
  const value = useContext(DashStateContext);
  if (!value) {
    throw new Error('useDashState precisa estar dentro de DashStateProvider');
  }
  return value;
}
