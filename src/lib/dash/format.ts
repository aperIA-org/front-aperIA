import { REF_NOW } from './mock-data';
import type { Criticality, Severity } from './types';

export const SEV_ORDER: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export const STATUS_PT: Record<string, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  offline: 'Offline',
};

export const REM_STATUS_PT: Record<string, string> = {
  suggested: 'Suggested',
  approved: 'Approved',
  rejected: 'Rejected',
  merged: 'Merged',
};

/**
 * Cores de severidade FIXAS — não trocam com o tema, igual ao
 * `tailwind.config` do protótipo. As variantes que acompanham o tema são as
 * custom properties `--sev-*` em globals.css, usadas pelas classes `.sev-*`.
 */
export const SEV_COLORS = {
  critical: '#ff2d3d',
  high: '#ff6a3d',
  medium: '#f5a524',
  low: '#f5d524',
  info: '#4aa3ff',
  safe: '#2ecc8b',
} as const;

/** Cores dos gráficos — tom mais fechado que os badges. */
export const CHART_SEV = {
  critical: '#E1101B',
  high: '#F2600C',
  medium: '#E8B004',
  low: '#E8E004',
  info: '#2F86E0',
} as const;

export function sevColor(s: string): string {
  return (SEV_COLORS as Record<string, string>)[s] ?? 'var(--text-secondary)';
}

export function critColor(c: Criticality): string {
  return sevColor(c);
}

/** #rrggbb + alfa → rgba(). */
export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Escala do risk score, que difere entre as duas fontes de dado.
 *
 * O protótipo usava 0–1000; a API usa **0–100** (`risk_score.score` no schema
 * do Tier 2, e é o que o relatório em markdown exibe: "74/100"). Os limiares
 * daqui estavam fixos na escala antiga, então um risco 74/100 — `high` para a
 * API — caía abaixo de 400 e era pintado de VERDE, dizendo "ok" sobre um scan
 * de risco alto. O gauge, pelo mesmo motivo, rotulava "74 de 1000".
 */
export const RISK_MAX_DEMO = 1000;
export const RISK_MAX_API = 100;

/** Escala correta para a origem do dado — `demo` usa o protótipo. */
export function riskMax(demo: boolean): number {
  return demo ? RISK_MAX_DEMO : RISK_MAX_API;
}

/**
 * Cor do risco, comparada em FRAÇÃO da escala e não em valor absoluto.
 *
 * Os cortes seguem os mesmos do protótipo (>70% crítico, >=40% médio), agora
 * independentes de a escala ser 0–1000 ou 0–100.
 */
export function riskColor(score: number, max: number = RISK_MAX_DEMO): string {
  const fracao = max > 0 ? score / max : 0;
  return fracao > 0.7
    ? SEV_COLORS.critical
    : fracao >= 0.4
      ? SEV_COLORS.medium
      : SEV_COLORS.safe;
}

/**
 * Tempo relativo a partir de uma referência.
 *
 * O padrão é o relógio congelado (`REF_NOW`), que é o que mantém "há 3d"
 * estável entre visitas no dataset de demonstração. Telas com dados REAIS
 * precisam passar `now` — sem isso, uma data de hoje fica no futuro em relação
 * a `REF_NOW` (2024-06-29) e todo finding apareceria como "há 0m".
 *
 * O valor de `now` é calculado no server component e desce como prop: chamar
 * `Date.now()` no cliente divergiria do HTML do servidor e quebraria a
 * hidratação — ver CLAUDE.md.
 */
export function timeAgo(iso: string, now: number = REF_NOW): string {
  const d = new Date(iso).getTime();
  const diff = now - d;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const dy = Math.floor(h / 24);
  if (dy > 0) return 'há ' + dy + 'd';
  if (h > 0) return 'há ' + h + 'h';
  return 'há ' + Math.max(m, 0) + 'm';
}

/** Data absoluta em UTC — vai no `title` do tempo relativo. */
export function fmtAbs(iso: string): string {
  const d = new Date(iso);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(
    d.getUTCHours(),
  )}:${p(d.getUTCMinutes())} (UTC)`;
}

export function shortSha(sha: string): string {
  return sha.slice(0, 8);
}

const SOURCE_ICONS: Record<string, string> = {
  trufflehog: '🔍',
  semgrep: '⚡',
  trivy: '📦',
  prowler: '☁️',
  zap: '🌐',
};

export function sourceIcon(src: string): string {
  return SOURCE_ICONS[src] ?? '🔧';
}

/** Metadados dos 3 tiers de varredura. */
export const TIER_META = [
  {
    name: 'Tier 1',
    desc: 'Fast Feedback',
    sla: '≤3min',
    scanners: 'TruffleHog · Semgrep changed-files',
  },
  {
    name: 'Tier 2',
    desc: 'Standard Analysis',
    sla: '≤10min',
    scanners: 'Semgrep full · Trivy SCA · Prowler',
  },
  {
    name: 'Tier 3',
    desc: 'Deep Heuristic',
    sla: '30-60min',
    scanners: 'ZAP DAST · I.A attack-path',
  },
] as const;

export const TIER_STATUS_LABEL: Record<string, string> = {
  done: 'done',
  running: 'running',
  failed: 'failed',
  skipped: 'skip',
  queued: 'queued',
};

/** Circunferência do arco do gauge (r = 33 → 2πr ≈ 207.3). */
export const GAUGE_C = 207.3;

/**
 * Faixa do gauge de risk score. `gradientFrom` é a cor inicial do gradiente do
 * arco. Valores exatamente como no protótipo.
 */
export function gaugeBand(
  score: number,
  max: number = RISK_MAX_DEMO,
): {
  color: string;
  label: string;
  gradientFrom: string;
} {
  // Mesmos cortes de `riskColor`, em fração: rótulo e cor do arco precisam
  // concordar com a cor do número, senão o gauge diz "Baixo" em vermelho.
  const fracao = max > 0 ? score / max : 0;
  if (fracao > 0.7) return { color: '#ff2d3d', label: 'Crítico', gradientFrom: '#f5a524' };
  if (fracao >= 0.4) return { color: '#f5a524', label: 'Moderado', gradientFrom: '#f5d524' };
  return { color: '#2ecc8b', label: 'Baixo', gradientFrom: '#2ecc8b' };
}
