'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  clearSessionState,
  readJsonStorage,
  readStorage,
  removeStorage,
  STORAGE_KEYS,
  writeStorage,
} from '@/lib/storage';
import { DEFAULT_GH_INSTALLED_AT, DEFAULT_MONITORED } from './mock-data';

export type Theme = 'dark' | 'light';

/** Passos do onboarding simulado do GitHub App. */
export type OnboardingStep = 1 | 'installing' | 2;

type DashState = {
  /** `false` até o primeiro efeito rodar — evita mismatch de hidratação. */
  mounted: boolean;
  /** `?preview=1`: força conectado e suprime TODA escrita em localStorage. */
  isPreview: boolean;
  connected: boolean;
  monitored: string[];
  ghInstalledAt: string;
  sidebarCollapsed: boolean;
  theme: Theme;
  onboardingStep: OnboardingStep;

  setMonitored: (repos: string[]) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  connectGitHub: () => void;
  finishOnboarding: (repos: string[]) => void;
  disconnect: () => void;
  logout: () => void;
};

const DashStateContext = createContext<DashState | null>(null);

export function DashStateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const [mounted, setMounted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [monitored, setMonitoredState] = useState<string[]>(DEFAULT_MONITORED);
  const [ghInstalledAt, setGhInstalledAt] = useState(DEFAULT_GH_INSTALLED_AT);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(1);

  /** Em preview nada é persistido — o carrossel do cadastro não pode sujar o estado real. */
  const persist = useCallback(
    (key: string, value: string) => {
      if (!isPreview) writeStorage(key, value);
    },
    [isPreview],
  );

  // Hidratação: lê o estado salvo uma única vez, já no cliente.
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
    setConnected(isPreview || readStorage(STORAGE_KEYS.connected) === 'true');
    setMonitoredState(
      readJsonStorage<string[]>(STORAGE_KEYS.monitored, DEFAULT_MONITORED),
    );
    setGhInstalledAt(
      readStorage(STORAGE_KEYS.ghInstalled) ?? DEFAULT_GH_INSTALLED_AT,
    );
    setSidebarCollapsed(readStorage(STORAGE_KEYS.sidebarCollapsed) === 'true');
    setMounted(true);
  }, [isPreview, searchParams]);

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
      connected,
      monitored,
      ghInstalledAt,
      sidebarCollapsed,
      theme,
      onboardingStep,

      setMonitored: (repos) => {
        setMonitoredState(repos);
        persist(STORAGE_KEYS.monitored, JSON.stringify(repos));
      },

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

      connectGitHub: () => {
        setOnboardingStep('installing');
        // 900ms só para a instalação do GitHub App parecer real.
        window.setTimeout(() => {
          persist(STORAGE_KEYS.ghInstalled, DEFAULT_GH_INSTALLED_AT);
          setGhInstalledAt(DEFAULT_GH_INSTALLED_AT);
          setOnboardingStep(2);
        }, 900);
      },

      finishOnboarding: (repos) => {
        setMonitoredState(repos);
        persist(STORAGE_KEYS.monitored, JSON.stringify(repos));
        setConnected(true);
        persist(STORAGE_KEYS.connected, 'true');
        setOnboardingStep(1);
      },

      disconnect: () => {
        if (!isPreview) removeStorage(STORAGE_KEYS.connected);
        setConnected(false);
        setOnboardingStep(1);
      },

      logout: () => {
        if (!isPreview) clearSessionState();
        router.push('/login');
      },
    }),
    [
      mounted,
      isPreview,
      connected,
      monitored,
      ghInstalledAt,
      sidebarCollapsed,
      theme,
      onboardingStep,
      persist,
      router,
    ],
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
