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

/** Faixas do risk score: >700 crítico, 400–700 âmbar, <400 verde. */
export function riskColor(score: number): string {
  return score > 700
    ? SEV_COLORS.critical
    : score >= 400
      ? SEV_COLORS.medium
      : SEV_COLORS.safe;
}

/**
 * Tempo relativo a partir do relógio congelado (`REF_NOW`), e não de agora —
 * é o que mantém "há 3d" estável entre visitas.
 */
export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = REF_NOW - d;
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

export function gaugeBand(score: number): { color: string; label: string } {
  if (score > 700) return { color: SEV_COLORS.critical, label: 'crítico' };
  if (score >= 400) return { color: SEV_COLORS.medium, label: 'atenção' };
  return { color: SEV_COLORS.safe, label: 'controlado' };
}
