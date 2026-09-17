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
  team: '/dash/time',
};

/** Âncora da seção de seleção de repositórios dentro de `/dash/repositorios`. */
export const MONITORED_REPOS_ANCHOR = 'repositorios-monitorados';

export const monitoredReposRoute = `${SCREEN_ROUTES.integrations}#${MONITORED_REPOS_ANCHOR}`;

/**
 * Detalhe de uma execução.
 *
 * `origem` marca de onde o usuário veio, e existe só para o "voltar" da tela de
 * destino cair no lugar certo: quem chega pelo card de Scans espera voltar para
 * Scans, não para a lista de Relatórios — que é uma terceira tela, com as mesmas
 * execuções em outra apresentação. Sem o parâmetro, o padrão é Relatórios, que é
 * o índice desta rota.
 */
export type ReportOrigin = 'scans' | 'reports';

export function reportDetailRoute(execId: string, origem?: ReportOrigin): string {
  const base = `/dash/relatorios/${execId}`;
  return origem === 'scans' ? `${base}?de=scans` : base;
}

/** Lê o `?de=` de volta, ignorando qualquer valor que não conheçamos. */
export function reportOrigin(value: string | undefined): ReportOrigin {
  return value === 'scans' ? 'scans' : 'reports';
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

/**
 * Deep link para as ocorrências de UM tipo de problema.
 *
 * É o drill-down de um grupo: `titulo` vai como `?title=` para a API, em
 * igualdade EXATA, e o recorte acontece no servidor — 3 mil ocorrências não
 * sobreviveriam ao teto do cliente.
 *
 * `de=all` é obrigatório aqui, não estético. Sem ele vale a janela padrão de 90
 * dias, e o relatório de um commit mais antigo linkaria para uma lista vazia sem
 * dizer por quê.
 */
export function findingsByTitleRoute(title: string): string {
  const params = new URLSearchParams({ vis: 'todos', titulo: title, de: 'all' });
  return `${SCREEN_ROUTES.findings}?${params.toString()}`;
}

/** Resolve a tela a partir do pathname — usado pela sidebar e pelo breadcrumb. */
export function screenFromPathname(pathname: string): DashScreen {
  if (pathname.startsWith('/dash/relatorios/')) return 'reportDetail';

  const match = (Object.entries(SCREEN_ROUTES) as [DashScreen, string][]).find(
    ([screen, route]) => route === pathname && screen !== 'reportDetail',
  );
  return match?.[0] ?? 'home';
}

/** Mensagem que o preview do cadastro envia para o iframe do dashboard. */
export const PREVIEW_NAVIGATE_MESSAGE = 'aperia:preview-navigate';

export type PreviewNavigateMessage = {
  type: typeof PREVIEW_NAVIGATE_MESSAGE;
  screen: DashScreen;
};
