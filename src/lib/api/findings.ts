import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import { repoShortName } from '@/lib/dash/github';
import type { Criticality, Finding, FindingGroup, Severity } from '@/lib/dash/types';
import { getApi } from './client';
import { COOKIE_NAMES, IS_API_CONFIGURED } from './config';

/**
 * Findings vindos da API (`GET /findings`).
 *
 * ESTRATÉGIA DE FILTRO: a rota aceita `severity`, `tier`, `source`,
 * `commit_sha` e `secret_verified` — mas só UM valor por dimensão, enquanto a
 * tela filtra por múltiplos, mais categoria (derivada do CWE), aging, busca
 * textual e intervalo de datas, que a API não conhece. Filtrar metade no
 * servidor e metade no cliente daria resultado ERRADO, porque o filtro-cliente
 * só enxergaria a página corrente.
 *
 * Então o conjunto é buscado inteiro (paginando de 200 em 200, com teto) e todo
 * o filtro continua em `findings-filters.ts`, exatamente como já funcionava com
 * o dataset mock. Na escala do protótipo isso é barato e preserva o
 * comportamento; quando o volume crescer, o caminho é a API ganhar filtros
 * multi-valor e paginação server-side de verdade.
 */

const PAGE_SIZE = 200;

/** Teto de segurança: evita varrer um dataset grande em um request só. */
const MAX_FINDINGS = 1000;

type ApiFinding = {
  id: string;
  source: string;
  severity: string;
  tier: number;
  title: string;
  description: string;
  cve_id: string | null;
  cwe_id: string | null;
  file_path: string | null;
  line_number: number | null;
  asset: string | null;
  asset_criticality: string | null;
  secret_verified: boolean;
  secret_type: string | null;
  commit_sha: string;
  repo_url: string;
  created_at: string;
};

export type FindingsResult = {
  findings: Finding[];
  total: number;
  /** `true` quando o teto foi atingido e a lista não é o conjunto completo. */
  truncated: boolean;
  /** `false` quando a API não respondeu — a tela mostra estado neutro. */
  ok: boolean;
};

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const CRITICALITIES: Criticality[] = ['critical', 'high', 'medium', 'low'];

function toSeverity(value: string): Severity {
  return (SEVERITIES as string[]).includes(value) ? (value as Severity) : 'info';
}

function toCriticality(value: string | null): Criticality {
  return value && (CRITICALITIES as string[]).includes(value)
    ? (value as Criticality)
    : 'medium';
}

/**
 * DTO da API → `Finding` da tela.
 *
 * Três campos do tipo local não existem no schema da API e são preenchidos aqui
 * de forma explícita, nunca inventada:
 *
 * - `status` / `resolved_at`: a API não modela resolução de finding. Todo
 *   finding que ela devolve está aberto. A tela esconde o filtro
 *   aberto/resolvido quando os dados são reais — ver `FindingsScreen`.
 * - `owner_team`: não há dono de repositório no back-end (a tela de Time é
 *   mock). Fica vazio, e a coluna some.
 *
 * `asset` é nullable no schema; o fallback é o nome curto do repositório, que é
 * o que a tela usa como chave de agrupamento.
 */
function toFinding(dto: ApiFinding): Finding {
  const asset =
    dto.asset ?? repoShortName(dto.repo_url.replace(/^https?:\/\/[^/]+\//, '')) ?? '';

  return {
    id: dto.id,
    source: dto.source,
    severity: toSeverity(dto.severity),
    title: dto.title,
    description: dto.description,
    commit_sha: dto.commit_sha,
    repo_url: dto.repo_url,
    cve_id: dto.cve_id,
    cwe_id: dto.cwe_id,
    file_path: dto.file_path ?? '',
    line_number: dto.line_number ?? 0,
    asset,
    asset_criticality: toCriticality(dto.asset_criticality),
    secret_verified: dto.secret_verified,
    secret_type: dto.secret_type,
    tier: dto.tier,
    created_at: dto.created_at,
    owner_team: '',
    status: 'open',
    resolved_at: null,
  };
}

function isApiFinding(value: unknown): value is ApiFinding {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ApiFinding).id === 'string' &&
    typeof (value as ApiFinding).commit_sha === 'string'
  );
}

async function accessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.access)?.value;
}

/**
 * Só a contagem de findings, para o badge da sidebar.
 *
 * `limit=1` porque a API devolve `total` na página: uma requisição mínima em
 * vez de varrer o conjunto inteiro num layout que roda em TODA rota do dash.
 * `null` quando não deu para contar — o badge some em vez de mostrar zero.
 */
export const fetchFindingsCount = cache(async (): Promise<number | null> => {
  if (!IS_API_CONFIGURED) return null;

  const token = await accessToken();
  if (!token) return null;

  try {
    const { status, data } = await getApi('/findings?limit=1&offset=0', token);
    if (status !== 200 || !data || typeof data !== 'object') return null;
    const total = (data as { total?: unknown }).total;
    return typeof total === 'number' ? total : null;
  } catch {
    return null;
  }
});

/**
 * Busca findings do usuário, paginando até o teto.
 *
 * `commitSha` escopa a um commit (usado pelo detalhe de relatório). Sem ele, é
 * o conjunto do usuário — que é o que a tela de Findings filtra.
 *
 * `title` é o drill-down de um grupo de `GET /findings/groups`: igualdade
 * EXATA, não busca livre (a busca livre continua no cliente, em
 * `findings-filters.ts`). É o que faz a visão "Todos" de um grupo mostrar as
 * ocorrências DAQUELE problema em vez de cair no teto de 1000 varrendo o
 * conjunto inteiro.
 */
export const fetchFindings = cache(
  async (commitSha?: string, title?: string): Promise<FindingsResult> => {
    if (!IS_API_CONFIGURED) {
      return { findings: [], total: 0, truncated: false, ok: false };
    }

    const token = await accessToken();
    if (!token) return { findings: [], total: 0, truncated: false, ok: false };

    const collected: Finding[] = [];
    let offset = 0;
    let total = 0;

    try {
      while (offset < MAX_FINDINGS) {
        const query = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (commitSha) query.set('commit_sha', commitSha);
        if (title) query.set('title', title);

        const { status, data } = await getApi(`/findings?${query.toString()}`, token);
        if (status !== 200 || !data || typeof data !== 'object') {
          return { findings: [], total: 0, truncated: false, ok: false };
        }

        const page = data as { items?: unknown; total?: unknown };
        if (!Array.isArray(page.items)) {
          return { findings: [], total: 0, truncated: false, ok: false };
        }

        total = typeof page.total === 'number' ? page.total : collected.length;
        collected.push(...page.items.filter(isApiFinding).map(toFinding));

        if (page.items.length < PAGE_SIZE || collected.length >= total) break;
        offset += PAGE_SIZE;
      }
    } catch {
      return { findings: [], total: 0, truncated: false, ok: false };
    }

    return {
      findings: collected,
      total,
      truncated: total > collected.length,
      ok: true,
    };
  },
);

// ── Grupos ───────────────────────────────────────────────────────────────────

type ApiFindingGroup = {
  source: string;
  severity: string;
  tier: number;
  title: string;
  cve_id: string | null;
  cwe_id: string | null;
  asset: string | null;
  ocorrencias: number;
  caminhos: number;
  algum_secret_verificado: boolean;
  primeiro_em: string;
  ultimo_em: string;
  exemplo_finding_id: string;
  amostra: unknown;
};

export type FindingGroupsResult = {
  groups: FindingGroup[];
  /** Soma das ocorrências — o tamanho REAL do conjunto por trás dos grupos. */
  totalFindings: number;
  /**
   * Teto de grupos atingido (500). Aí `totalFindings` soma só os devolvidos e
   * subestima o real — um número cortado sem aviso mente pior do que o aviso.
   */
  truncated: boolean;
  /** `false` quando a API não respondeu — a tela mostra estado neutro. */
  ok: boolean;
};

const GROUPS_FAILED: FindingGroupsResult = {
  groups: [],
  totalFindings: 0,
  truncated: false,
  ok: false,
};

/**
 * Quantos caminhos de exemplo vêm por grupo.
 *
 * É o que a expansão da linha mostra sem nova chamada. Oito cabe na tela e
 * mantém a resposta pequena; acima disso o usuário quer mesmo é a visão
 * "Todos" daquele grupo.
 */
const GROUP_SAMPLE_SIZE = 8;

function isApiFindingGroup(value: unknown): value is ApiFindingGroup {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ApiFindingGroup).title === 'string' &&
    typeof (value as ApiFindingGroup).ocorrencias === 'number' &&
    typeof (value as ApiFindingGroup).exemplo_finding_id === 'string'
  );
}

function toGroup(dto: ApiFindingGroup): FindingGroup {
  return {
    source: dto.source,
    severity: toSeverity(dto.severity),
    tier: dto.tier,
    title: dto.title,
    cve_id: dto.cve_id,
    cwe_id: dto.cwe_id,
    asset: dto.asset,
    ocorrencias: dto.ocorrencias,
    caminhos: dto.caminhos,
    algum_secret_verificado: dto.algum_secret_verificado,
    primeiro_em: dto.primeiro_em,
    ultimo_em: dto.ultimo_em,
    exemplo_finding_id: dto.exemplo_finding_id,
    amostra: Array.isArray(dto.amostra) ? dto.amostra.filter((p) => typeof p === 'string') : [],
  };
}

/**
 * Findings agrupados por tipo (`GET /findings/groups`).
 *
 * Sem paginação de propósito: o agrupamento derruba a cardinalidade em três
 * ordens de grandeza (12 mil findings → ~14 grupos) e a resposta inteira cabe
 * numa tela. Já vem ordenada por severidade desc e depois volume desc — a
 * ordem do servidor é a ordem padrão da tela.
 */
export const fetchFindingGroups = cache(
  async (commitSha?: string): Promise<FindingGroupsResult> => {
    if (!IS_API_CONFIGURED) return GROUPS_FAILED;

    const token = await accessToken();
    if (!token) return GROUPS_FAILED;

    try {
      const query = new URLSearchParams({ amostra: String(GROUP_SAMPLE_SIZE) });
      if (commitSha) query.set('commit_sha', commitSha);

      const { status, data } = await getApi(`/findings/groups?${query.toString()}`, token);
      if (status !== 200 || !data || typeof data !== 'object') return GROUPS_FAILED;

      const payload = data as {
        items?: unknown;
        total_findings?: unknown;
        truncado?: unknown;
      };
      if (!Array.isArray(payload.items)) return GROUPS_FAILED;

      const groups = payload.items.filter(isApiFindingGroup).map(toGroup);
      const totalFindings =
        typeof payload.total_findings === 'number'
          ? payload.total_findings
          : groups.reduce((soma, g) => soma + g.ocorrencias, 0);

      return { groups, totalFindings, truncated: payload.truncado === true, ok: true };
    } catch {
      return GROUPS_FAILED;
    }
  },
);
