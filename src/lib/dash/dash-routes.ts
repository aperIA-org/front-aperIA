/**
 * Mapa de telas do dashboard.
 *
 * No site estático o dashboard era uma única página que trocava
 * `#app-main.innerHTML` e guardava a tela em `localStorage.aperia-screen`.
 * Aqui cada tela é uma rota real do App Router — mas as CHAVES antigas
 * (`home`, `findings`, `pipelines`, ...) continuam sendo a identidade da tela,
 * porque o preview via iframe do cadastro navega por elas e a sidebar ainda
 * expõe `data-screen` para compatibilidade.
 */

export const DASH_SCREENS = [
  'home',
  'findings',
  'pipelines',
  'reports',
  'reportDetail',
  'remediations',
  'attack',
  'integrations',
  'repos',
  'team',
] as const;

export type DashScreen = (typeof DASH_SCREENS)[number];

/** Telas que só têm conteúdo depois do onboarding do GitHub. */
export const DATA_SCREENS: readonly DashScreen[] = [
  'findings',
  'pipelines',
  'reports',
  'reportDetail',
  'attack',
  'remediations',
];

export const SCREEN_LABELS: Record<DashScreen, string> = {
  home: 'Início',
  findings: 'Findings',
  pipelines: 'Scans',
  reports: 'Relatórios',
  reportDetail: 'Relatórios',
  remediations: 'Remediações',
  attack: 'AI Emulation',
  integrations: 'Repositórios',
  repos: 'Repositórios',
  team: 'Time',
};

export const SCREEN_ROUTES: Record<DashScreen, string> = {
  home: '/dash',
  findings: '/dash/findings',
  pipelines: '/dash/scans',
  reports: '/dash/relatorios',
  reportDetail: '/dash/relatorios',
  remediations: '/dash/remediacoes',
  attack: '/dash/ai-emulation',
  integrations: '/dash/repositorios',
  repos: '/dash/repositorios/gerenciar',
  team: '/dash/time',
};

export function reportDetailRoute(execId: string): string {
  return `/dash/relatorios/${execId}`;
}

/**
 * Deep link para um finding específico.
 *
 * No protótipo, clicar num finding abria um slide-over na mesma tela. Aqui a
 * navegação é por URL: a lista de Findings lê `?finding=` e rola/destaca a
 * linha. Detalhe de execução e Remediações linkam para cá — manter num helper
 * evita que cada tela invente o nome do parâmetro.
 */
export function findingRoute(findingId: string): string {
  return `${SCREEN_ROUTES.findings}?finding=${encodeURIComponent(findingId)}`;
}

/** Resolve a tela a partir do pathname — usado pela sidebar e pelo breadcrumb. */
export function screenFromPathname(pathname: string): DashScreen {
  if (pathname.startsWith('/dash/relatorios/')) return 'reportDetail';
  if (pathname.startsWith('/dash/repositorios/gerenciar')) return 'repos';

  const match = (Object.entries(SCREEN_ROUTES) as [DashScreen, string][]).find(
    ([screen, route]) =>
      route === pathname && screen !== 'reportDetail' && screen !== 'repos',
  );
  return match?.[0] ?? 'home';
}

/** Mensagem que o preview do cadastro envia para o iframe do dashboard. */
export const PREVIEW_NAVIGATE_MESSAGE = 'aperia:preview-navigate';

export type PreviewNavigateMessage = {
  type: typeof PREVIEW_NAVIGATE_MESSAGE;
  screen: DashScreen;
};
