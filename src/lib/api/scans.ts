import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import type { ScanIaSummary } from '@/lib/dash/pipeline-tools';
import type { FindingsSummary, RiskLevel, ScanJob, TierStatus } from '@/lib/dash/types';
import { getApi } from './client';
import { COOKIE_NAMES, IS_API_CONFIGURED } from './config';

/**
 * Scans vindos da API (`GET /scans`, `GET /scans/{id}`,
 * `GET /scans/{id}/history`, `GET /scans/{id}/tools`).
 *
 * `GET /scans/{id}/report` — o markdown gerado pelo pipeline — deixou de ter
 * consumidor quando a tela de relatório passou a mostrar a leitura estruturada
 * (veredito, caminhos de ataque, findings por etapa) em vez da prosa do LLM.
 *
 * A identidade de uma execução é o **`id`** da API (uuid). Já foi o
 * `commit_sha`, quando havia uma execução por commit; desde que rescanear a
 * mesma branch empilha uma execução nova em vez de sobrescrever a anterior, o
 * sha deixou de identificar um scan sozinho.
 *
 * A rota da API ainda aceita o sha — resolve para a execução *corrente* daquele
 * commit —, mas o front sempre usa o id: é ele que endereça o histórico.
 */

const TIER_STATUSES = ['done', 'running', 'failed', 'skipped'] as const;
const RISK_LEVELS = ['critical', 'high', 'medium', 'low', 'blocked'] as const;

type ApiScanJob = {
  id: string;
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
  findings_summary?: {
    by_severity?: Record<string, number>;
    by_tier?: Record<string, number>;
    total?: number;
  };
  /** Só na listagem (`ScanJobSummary`): o total, sem a quebra por severidade. */
  findings_total?: number | null;
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

/**
 * `findings_summary` normalizado, ou `undefined` quando a API não o mandou.
 *
 * `undefined` importa: é "não sabemos" (execução vinda de uma rota que não
 * agrega, ou payload antigo), e a tela cai para contar o que tem em mão. Um
 * objeto zerado no lugar afirmaria "nenhum finding".
 */
function toFindingsSummary(dto: ApiScanJob): FindingsSummary | undefined {
  const raw = dto.findings_summary;
  if (!raw || typeof raw !== 'object') {
    /*
     * A LISTAGEM não manda o resumo completo, só o total (`ScanJobSummary`).
     * Ele entra aqui como um resumo sem quebra por severidade — é o mesmo número
     * que o detalhe devolve, porque as duas contam findings do commit, e é o que
     * permite a lista de Scans mostrar a contagem sem uma requisição por card.
     */
    return typeof dto.findings_total === 'number'
      ? { by_severity: {}, by_tier: {}, total: dto.findings_total }
      : undefined;
  }
  return {
    by_severity: raw.by_severity && typeof raw.by_severity === 'object' ? raw.by_severity : {},
    by_tier: raw.by_tier && typeof raw.by_tier === 'object' ? raw.by_tier : {},
    total: typeof raw.total === 'number' ? raw.total : 0,
  };
}

/** `repo_full_name` é nullable no schema; a URL do repo é o fallback. */
function repoFullName(dto: ApiScanJob): string {
  if (dto.repo_full_name) return dto.repo_full_name;
  const path = dto.repo_url.replace(/^https?:\/\/[^/]+\//, '').replace(/\.git$/, '');
  return path || dto.repo_url;
}

function toScanJob(dto: ApiScanJob): ScanJob {
  return {
    id: dto.id,
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
    // `created_at` é preservado quando um commit é reescaneado, então exibi-lo
    // como "quando rodou" mostrava a primeira entrada do commit — um scan
    // recém-disparado aparecia como "há 10h".
    started_at: dto.tier1_started_at ?? dto.created_at,
    t1_dur: duration(dto.tier1_started_at, dto.tier1_completed_at),
    t2_dur: duration(dto.tier2_started_at, dto.tier2_completed_at),
    t3_dur: duration(dto.tier3_started_at, dto.tier3_completed_at),
    // Os inícios crus, além das durações: um tier em execução não tem
    // `completed_at`, então `duration()` devolve `null` e o tempo decorrido só
    // sai do `started_at`.
    tier_started_at: [
      dto.tier1_started_at,
      dto.tier2_started_at,
      dto.tier3_started_at,
    ],
    findings_summary: toFindingsSummary(dto),
  };
}

function isApiScanJob(value: unknown): value is ApiScanJob {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ApiScanJob).id === 'string' &&
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

/** Uma execução, por id (ou pelo sha, que resolve para a corrente do commit). */
export const fetchScan = cache(async (scanId: string): Promise<ScanJob | null> => {
  if (!IS_API_CONFIGURED) return null;

  const token = await accessToken();
  if (!token) return null;

  try {
    const { status, data } = await getApi(
      `/scans/${encodeURIComponent(scanId)}`,
      token,
    );
    if (status !== 200 || !isApiScanJob(data)) return null;
    return toScanJob(data);
  } catch {
    return null;
  }
});

/**
 * As execuções anteriores do mesmo commit, da mais recente para a mais antiga.
 *
 * Enquanto rescanear sobrescrevia a execução, isso não existia — o detalhe do
 * relatório só mostrava histórico no dataset do protótipo. Lista vazia é uma
 * resposta legítima (é o caso da primeira execução de um commit).
 */
export const fetchScanHistory = cache(async (scanId: string): Promise<ScanJob[]> => {
  if (!IS_API_CONFIGURED) return [];

  const token = await accessToken();
  if (!token) return [];

  try {
    const { status, data } = await getApi(
      `/scans/${encodeURIComponent(scanId)}/history`,
      token,
    );
    if (status !== 200 || !data || typeof data !== 'object') return [];

    const page = data as { items?: unknown };
    if (!Array.isArray(page.items)) return [];
    return page.items.filter(isApiScanJob).map(toScanJob);
  } catch {
    return [];
  }
});

/* ═══════════════════════ status por ferramenta ═══════════════════════ */

/**
 * `GET /scans/{id}/tools` — o desfecho de cada ferramenta desta execução.
 *
 * Complementa `tier{1,2,3}_status`: o tier diz em que etapa o pipeline está,
 * isto diz o que aconteceu dentro dela. Em particular, separa "rodou e não
 * achou nada" (`done` com `findings_count: 0`) de "quebrou" (`failed` com o
 * tipo da exceção em `reason`) — distinção que se perdia no `return []` do
 * `run_safe` da API antes da tabela `scan_tool_runs` existir.
 *
 * **Lista vazia é resposta legítima** e significa uma de duas coisas: o
 * pipeline ainda não chegou a nenhuma ferramenta, ou a execução é anterior à
 * migration (nada foi backfillado). Nos dois casos a tela cai para o status do
 * tier — por isso `expected` vem preenchido mesmo com `tools` vazio.
 */
export type ApiToolRun = {
  tier: number;
  tool: string;
  status: string;
  reason: string | null;
  findings_count: number | null;
  duration_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
};

export type ScanToolsResult = {
  tools: ApiToolRun[];
  /** Catálogo por tier, como a API o conhece (chave = número do tier). */
  expected: Record<string, string[]>;
  /**
   * Resumo da camada I.A do Tier 3, compactado pela API a partir do
   * `analysis_json` do relatório. `null` = não há relatório de Tier 3.
   *
   * A compactação é o ponto: o blob cru traz o array inteiro de findings com
   * `raw_output` (dezenas de KB por execução) e a lista de `finding_ids` em
   * frases longas. O que chega aqui é ~1 KB.
   */
  ia: ScanIaSummary | null;
  /** `false` = a API não respondeu. Diferente de "nenhuma ferramenta ainda". */
  ok: boolean;
};

const EMPTY_TOOLS: ScanToolsResult = { tools: [], expected: {}, ia: null, ok: false };

function isApiToolRun(value: unknown): value is ApiToolRun {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ApiToolRun).tool === 'string' &&
    typeof (value as ApiToolRun).status === 'string' &&
    typeof (value as ApiToolRun).tier === 'number'
  );
}

export const fetchScanTools = cache(async (scanId: string): Promise<ScanToolsResult> => {
  if (!IS_API_CONFIGURED) return EMPTY_TOOLS;

  const token = await accessToken();
  if (!token) return EMPTY_TOOLS;

  try {
    const { status, data } = await getApi(
      `/scans/${encodeURIComponent(scanId)}/tools`,
      token,
    );
    if (status !== 200 || !data || typeof data !== 'object') return EMPTY_TOOLS;

    const payload = data as { tools?: unknown; expected?: unknown; ia?: unknown };
    if (!Array.isArray(payload.tools)) return EMPTY_TOOLS;

    return {
      tools: payload.tools.filter(isApiToolRun),
      expected:
        payload.expected && typeof payload.expected === 'object'
          ? (payload.expected as Record<string, string[]>)
          : {},
      /*
       * A API já valida campo por campo contra o blob do LLM; aqui só o
       * contorno básico.
       *
       * `paths` OU `chains`, e não só `paths`: as duas telas percorrem `chains`
       * desde que o attack path passou a ser desenhado por cadeia, e um
       * relatório que traga apenas `attack_chains` perderia o `ia` inteiro —
       * o card diria "ninguém calculou" para uma execução que calculou.
       */
      ia:
        payload.ia &&
        typeof payload.ia === 'object' &&
        (Array.isArray((payload.ia as ScanIaSummary).paths) ||
          Array.isArray((payload.ia as ScanIaSummary).chains))
          ? (payload.ia as ScanIaSummary)
          : null,
      ok: true,
    };
  } catch {
    return EMPTY_TOOLS;
  }
});
