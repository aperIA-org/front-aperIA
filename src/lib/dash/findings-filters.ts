import { SEV_ORDER } from './format';
import { cweClass, DAY, FINDINGS, REF_NOW } from './mock-data';
import type { Finding } from './types';

/**
 * Estado de filtro da tela de Findings — a "fonte única" que o protótipo
 * chamava de `FF`.
 *
 * No original isso era um objeto mutável no escopo do módulo, sincronizado com
 * a URL à mão por `syncURL()`/`parseURLToFF()`. Aqui a URL é a fonte da
 * verdade e este módulo só traduz nos dois sentidos — o resultado é que
 * filtro fica compartilhável e o botão voltar funciona, de graça.
 *
 * Os NOMES dos parâmetros são os mesmos do protótipo (`repo`, `cat`, `sev`,
 * `scanner`, `tier`, `aging`, `status`, `q`, `de`, `ate`), então links antigos
 * continuam válidos.
 */

export const FF_PAGE_SIZE = 10;

export type SortColumn = 'sev' | 'tier' | 'when';
export type SortDir = 'asc' | 'desc';

export type FindingsFilters = {
  repositorios: string[];
  categorias: string[];
  severidades: string[];
  scanners: string[];
  tiers: number[];
  faixaAging: string[];
  status: string | null;
  busca: string;
  periodo: { de: number | null; ate: number | null };
  sort: { col: SortColumn; dir: SortDir };
  page: number;
};

/** Dimensões multi-valor, na ordem em que aparecem na barra de filtros ativos. */
export const FF_DIMS = [
  'repositorios',
  'categorias',
  'severidades',
  'scanners',
  'tiers',
  'faixaAging',
] as const;

export type FilterDim = (typeof FF_DIMS)[number];

/** dimensão → chave na query string. */
export const FF_URL: Record<FilterDim, string> = {
  repositorios: 'repo',
  categorias: 'cat',
  severidades: 'sev',
  scanners: 'scanner',
  tiers: 'tier',
  faixaAging: 'aging',
};

export const AGING_LABELS: Record<string, string> = {
  '0-7': '0–7 dias',
  '8-30': '8–30 dias',
  '31-90': '31–90 dias',
  '+90': '+90 dias',
};

export const SEV_STACK = ['critical', 'high', 'medium', 'low', 'info'] as const;
export const SCANNER_LIST = ['trufflehog', 'semgrep', 'trivy', 'prowler', 'zap'] as const;

/**
 * Janela padrão: últimos 90 dias.
 *
 * `now` é injetável porque a âncora depende da origem dos dados: o dataset de
 * demonstração vive em `REF_NOW` (2024-06-29), mas com findings REAIS a janela
 * precisa partir do agora de verdade — ancorada em `REF_NOW`, ela descartaria
 * todo finding recente e a tela viria vazia. O default preserva o mock.
 */
export function defaultFrom(now: number = REF_NOW): number {
  return now - 90 * DAY;
}

export function agingBucketOf(
  finding: Pick<Finding, 'created_at'>,
  now: number = REF_NOW,
): string {
  const age = Math.max(0, Math.floor((now - new Date(finding.created_at).getTime()) / DAY));
  if (age <= 7) return '0-7';
  if (age <= 30) return '8-30';
  if (age <= 90) return '31-90';
  return '+90';
}

// ── URL ⇄ estado ─────────────────────────────────────────────────────────────

export function parseFilters(
  params: URLSearchParams,
  now: number = REF_NOW,
): FindingsFilters {
  const list = (key: string): string[] => {
    const raw = params.get(key);
    return raw ? raw.split(',').filter(Boolean) : [];
  };
  const num = (key: string): number | null => {
    const raw = params.get(key);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sortCol = params.get('sort');
  const col: SortColumn =
    sortCol === 'tier' || sortCol === 'when' || sortCol === 'sev' ? sortCol : 'sev';
  const dirParam = params.get('dir');
  const dir: SortDir =
    dirParam === 'asc' || dirParam === 'desc' ? dirParam : col === 'sev' ? 'desc' : 'asc';

  const page = num('page');

  return {
    repositorios: list(FF_URL.repositorios),
    categorias: list(FF_URL.categorias),
    severidades: list(FF_URL.severidades),
    scanners: list(FF_URL.scanners),
    tiers: list(FF_URL.tiers).map(Number).filter(Number.isFinite),
    faixaAging: list(FF_URL.faixaAging),
    status: params.get('status'),
    busca: params.get('q') ?? '',
    // `de` ausente = janela padrão de 90 dias (mesma regra do protótipo);
    // `de=all` = todo o histórico, que internamente é `null`.
    periodo: {
      de: params.get('de') === 'all' ? null : (num('de') ?? defaultFrom(now)),
      ate: num('ate'),
    },
    sort: { col, dir },
    page: page && page >= 1 ? Math.floor(page) : 1,
  };
}

export function serializeFilters(
  filters: FindingsFilters,
  now: number = REF_NOW,
): string {
  const params = new URLSearchParams();

  for (const dim of FF_DIMS) {
    const values = filters[dim] as (string | number)[];
    if (values.length) params.set(FF_URL[dim], values.join(','));
  }
  if (filters.status) params.set('status', filters.status);
  if (filters.busca) params.set('q', filters.busca);
  // Só serializa o período quando difere do padrão, para não poluir a URL.
  if (filters.periodo.de !== null && filters.periodo.de !== defaultFrom(now)) {
    params.set('de', String(filters.periodo.de));
  }
  if (filters.periodo.de === null) params.set('de', 'all');
  if (filters.periodo.ate !== null) params.set('ate', String(filters.periodo.ate));
  if (filters.sort.col !== 'sev') params.set('sort', filters.sort.col);
  if (filters.sort.dir !== (filters.sort.col === 'sev' ? 'desc' : 'asc')) {
    params.set('dir', filters.sort.dir);
  }
  if (filters.page > 1) params.set('page', String(filters.page));

  return params.toString();
}

// ── Derivações ───────────────────────────────────────────────────────────────

export type PeriodPreset = '7' | '30' | '90' | 'all' | 'custom';

export function periodPreset(
  filters: FindingsFilters,
  now: number = REF_NOW,
): PeriodPreset {
  const { de, ate } = filters.periodo;
  if (ate !== null) return 'custom';
  if (de === null) return 'all';
  const days = Math.round((now - de) / DAY);
  if (days === 7) return '7';
  if (days === 30) return '30';
  if (days === 90) return '90';
  return 'custom';
}

export function periodNoteLabel(filters: FindingsFilters, now: number = REF_NOW): string {
  const preset = periodPreset(filters, now);
  if (preset === '7') return 'Últimos 7 dias, por dia';
  if (preset === '30') return 'Últimos 30 dias, por semana';
  if (preset === '90') return 'Últimos 90 dias, por quinzena';
  if (preset === 'all') return 'Todo o histórico';
  const de = filters.periodo.de
    ? new Date(filters.periodo.de).toLocaleDateString('pt-BR')
    : 'início';
  const ate = filters.periodo.ate
    ? new Date(filters.periodo.ate).toLocaleDateString('pt-BR')
    : 'hoje';
  return `De ${de} a ${ate}`;
}

/** `true` quando algo além do padrão está aplicado — controla a barra de chips. */
export function anyFilterActive(filters: FindingsFilters, now: number = REF_NOW): boolean {
  const dimsActive = FF_DIMS.some((dim) => (filters[dim] as unknown[]).length > 0);
  return (
    dimsActive || !!filters.status || !!filters.busca || periodPreset(filters, now) !== '90'
  );
}

/**
 * Aplica todas as dimensões — mesma ordem do `applyScope()` original.
 *
 * `source` é parâmetro porque a tela passou a receber os findings da API; o
 * default mantém o dataset do protótipo para quem ainda depende dele.
 */
export function applyScope(
  filters: FindingsFilters,
  source: Finding[] = FINDINGS,
  now: number = REF_NOW,
): Finding[] {
  let scope = source.slice();

  if (filters.repositorios.length)
    scope = scope.filter((x) => filters.repositorios.includes(x.asset));
  if (filters.categorias.length)
    scope = scope.filter((x) => filters.categorias.includes(cweClass(x)));
  if (filters.severidades.length)
    scope = scope.filter((x) => filters.severidades.includes(x.severity));
  if (filters.scanners.length)
    scope = scope.filter((x) => filters.scanners.includes(x.source));
  if (filters.tiers.length) scope = scope.filter((x) => filters.tiers.includes(x.tier));
  if (filters.faixaAging.length)
    scope = scope.filter((x) => filters.faixaAging.includes(agingBucketOf(x, now)));
  if (filters.periodo.de !== null)
    scope = scope.filter(
      (x) => new Date(x.created_at).getTime() >= (filters.periodo.de as number),
    );
  if (filters.periodo.ate !== null)
    scope = scope.filter(
      (x) => new Date(x.created_at).getTime() <= (filters.periodo.ate as number),
    );
  if (filters.busca) {
    const q = filters.busca.toLowerCase();
    scope = scope.filter(
      (x) =>
        x.title.toLowerCase().includes(q) ||
        (x.file_path || '').toLowerCase().includes(q) ||
        (x.cve_id || '').toLowerCase().includes(q),
    );
  }
  return scope;
}

export function sortFindings(list: Finding[], sort: FindingsFilters['sort']): Finding[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return list.slice().sort((a, b) => {
    let av: number;
    let bv: number;
    if (sort.col === 'tier') {
      av = a.tier;
      bv = b.tier;
    } else if (sort.col === 'when') {
      av = new Date(a.created_at).getTime();
      bv = new Date(b.created_at).getTime();
    } else {
      av = SEV_ORDER[a.severity] ?? 0;
      bv = SEV_ORDER[b.severity] ?? 0;
    }
    return (av - bv) * dir;
  });
}

/** Números de página no formato `1 … v-1 v v+1 … N`. */
export function pageNumbers(current: number, total: number): (number | '…')[] {
  const set = new Set(
    [1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total),
  );
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}
