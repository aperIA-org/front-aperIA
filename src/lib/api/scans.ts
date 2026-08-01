import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import type { RiskLevel, ScanJob, TierStatus } from '@/lib/dash/types';
import { getApi } from './client';
import { COOKIE_NAMES, IS_API_CONFIGURED } from './config';

/**
 * Scans e relatórios vindos da API (`GET /scans`, `GET /scans/{sha}`,
 * `GET /scans/{sha}/report`).
 *
 * A identidade de uma execução na API é o **`commit_sha`**, não um id próprio:
 * não existe `ScanJob.id`. O tipo local exige `id`, então ele recebe o próprio
 * `commit_sha` — é o que faz `reportDetailRoute()` continuar funcionando, agora
 * com URLs do tipo `/dash/relatorios/<sha>`.
 */

const TIER_STATUSES = ['done', 'running', 'failed', 'skipped'] as const;
const RISK_LEVELS = ['critical', 'high', 'medium', 'low', 'blocked'] as const;

type ApiScanJob = {
  commit_sha: string;
  repo_url: string;
  repo_full_name: string | null;
  pr_number: number | null;
  tier1_status: string | null;
  tier1_started_at: string | null;
  tier1_completed_at: string | null;
  tier2_status: string | null;
  tier2_started_at: string | null;
  tier2_completed_at: string | null;
  tier3_status: string | null;
  tier3_started_at: string | null;
  tier3_completed_at: string | null;
  blocked_at_tier: number | null;
  final_risk_score: number | null;
  final_risk_level: string | null;
  created_at: string;
};

export type ScanReport = {
  tier: number;
  report_markdown: string;
  analysis_json: Record<string, unknown>;
  degraded: boolean;
  comment_id: number | null;
  posted: boolean;
  created_at: string;
};

function toTierStatus(value: string | null): TierStatus {
  return value && (TIER_STATUSES as readonly string[]).includes(value)
    ? (value as TierStatus)
    : null;
}

function toRiskLevel(value: string | null): RiskLevel {
  return value && (RISK_LEVELS as readonly string[]).includes(value)
    ? (value as RiskLevel)
    : null;
}

/** "12m", "1h 4m" — o protótipo trazia isso pronto; aqui vem dos timestamps. */
function duration(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null;
  const ms = Date.parse(completedAt) - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** `repo_full_name` é nullable no schema; a URL do repo é o fallback. */
function repoFullName(dto: ApiScanJob): string {
  if (dto.repo_full_name) return dto.repo_full_name;
  const path = dto.repo_url.replace(/^https?:\/\/[^/]+\//, '').replace(/\.git$/, '');
  return path || dto.repo_url;
}

function toScanJob(dto: ApiScanJob): ScanJob {
  return {
    // Sem id próprio na API: o commit é a identidade da execução.
    id: dto.commit_sha,
    commit_sha: dto.commit_sha,
    repo_full_name: repoFullName(dto),
    // `pr_number` é nullable desde que o scan manual existe (roda sem PR).
    pr_number: dto.pr_number ?? 0,
    tier1_status: toTierStatus(dto.tier1_status),
    tier2_status: toTierStatus(dto.tier2_status),
    tier3_status: toTierStatus(dto.tier3_status),
    blocked_at_tier: dto.blocked_at_tier,
    final_risk_score: dto.final_risk_score,
    final_risk_level: toRiskLevel(dto.final_risk_level),
    created_at: dto.created_at,
    t1_dur: duration(dto.tier1_started_at, dto.tier1_completed_at),
    t2_dur: duration(dto.tier2_started_at, dto.tier2_completed_at),
    t3_dur: duration(dto.tier3_started_at, dto.tier3_completed_at),
  };
}

function isApiScanJob(value: unknown): value is ApiScanJob {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ApiScanJob).commit_sha === 'string'
  );
}

async function accessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.access)?.value;
}

export type ScansResult = { jobs: ScanJob[]; total: number; ok: boolean };

/** Execuções do usuário, mais recentes primeiro (a API já ordena assim). */
export const fetchScans = cache(async (limit = 200): Promise<ScansResult> => {
  if (!IS_API_CONFIGURED) return { jobs: [], total: 0, ok: false };

  const token = await accessToken();
  if (!token) return { jobs: [], total: 0, ok: false };

  try {
    const { status, data } = await getApi(`/scans?limit=${limit}&offset=0`, token);
    if (status !== 200 || !data || typeof data !== 'object') {
      return { jobs: [], total: 0, ok: false };
    }
    const page = data as { items?: unknown; total?: unknown };
    if (!Array.isArray(page.items)) return { jobs: [], total: 0, ok: false };

    return {
      jobs: page.items.filter(isApiScanJob).map(toScanJob),
      total: typeof page.total === 'number' ? page.total : page.items.length,
      ok: true,
    };
  } catch {
    return { jobs: [], total: 0, ok: false };
  }
});

/** Uma execução por commit. `null` = 404 ou API fora. */
export const fetchScan = cache(async (commitSha: string): Promise<ScanJob | null> => {
  if (!IS_API_CONFIGURED) return null;

  const token = await accessToken();
  if (!token) return null;

  try {
    const { status, data } = await getApi(
      `/scans/${encodeURIComponent(commitSha)}`,
      token,
    );
    if (status !== 200 || !isApiScanJob(data)) return null;
    return toScanJob(data);
  } catch {
    return null;
  }
});

/**
 * Relatórios de um commit — um por tier, em markdown gerado pelo pipeline.
 *
 * É este markdown que É o relatório. A tela do protótipo compunha um relatório
 * à mão a partir do dataset mock; com dados reais o conteúdo vem daqui.
 */
export const fetchScanReports = cache(async (commitSha: string): Promise<ScanReport[]> => {
  if (!IS_API_CONFIGURED) return [];

  const token = await accessToken();
  if (!token) return [];

  try {
    const { status, data } = await getApi(
      `/scans/${encodeURIComponent(commitSha)}/report`,
      token,
    );
    if (status !== 200 || !data || typeof data !== 'object') return [];

    const payload = data as { reports?: unknown };
    if (!Array.isArray(payload.reports)) return [];

    return payload.reports.filter(
      (report): report is ScanReport =>
        !!report && typeof report === 'object' && typeof (report as ScanReport).tier === 'number',
    );
  } catch {
    return [];
  }
});
