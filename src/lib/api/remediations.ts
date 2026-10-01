import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import type {
  RemediationDestino,
  RemediationItem,
  RemediationStatus,
  Severity,
} from '@/lib/dash/types';
import { repoWebUrl } from '@/lib/dash/github';
import { getApi } from './client';
import { COOKIE_NAMES, IS_API_CONFIGURED } from './config';

/**
 * Remediações vindas da API (`GET /remediations`).
 *
 * Diferente de Findings, aqui NÃO há paginação nem filtro no cliente: o
 * pipeline gera no máximo `REMEDIATION_MAX_PER_SCAN` patches por execução
 * (10 hoje), então o conjunto de um usuário cabe numa página com folga. O
 * `scanJobId` é o único recorte, e ele vai para o servidor — é o `?scan=` da
 * URL, o contrato que a tela de Scans usa para linkar uma execução.
 *
 * Cada item já chega com o contexto do finding e do scan. Resolver isso no
 * cliente significaria buscar o conjunto inteiro de findings do usuário para
 * exibir uma dezena de cards.
 */

/** Teto de segurança; hoje nenhum usuário chega perto dele. */
const PAGE_LIMIT = 200;

type ApiRemediation = {
  id: string;
  finding_id: string;
  scan_job_id: string;
  status: string;
  explanation: string;
  patch_diff: string;
  requires_secret_rotation: boolean;
  rotation_instructions: string | null;
  github_comment_id: number | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  finding_title: string | null;
  finding_severity: string | null;
  finding_file_path: string | null;
  finding_repo_url: string | null;
  repo_full_name: string | null;
  pr_number: number | null;
  commit_sha: string | null;
};

export type RemediationsResult = {
  remediations: RemediationItem[];
  total: number;
  /** `false` quando a API não respondeu — a tela mostra estado neutro. */
  ok: boolean;
};

const FALHOU: RemediationsResult = { remediations: [], total: 0, ok: false };

const STATUSES: RemediationStatus[] = ['suggested', 'approved', 'rejected', 'merged'];
const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

function toStatus(value: string): RemediationStatus {
  return (STATUSES as string[]).includes(value)
    ? (value as RemediationStatus)
    : 'suggested';
}

function toSeverity(value: string | null): Severity | null {
  return value && (SEVERITIES as string[]).includes(value) ? (value as Severity) : null;
}

/**
 * DTO da API → item da tela.
 *
 * O `finding` só é montado quando há título: a remediação sobrevive ao
 * desaparecimento da linha de origem (o join é LEFT no servidor), e nesse caso
 * o card cai no fallback em vez de mostrar campos vazios. Mesma regra para o
 * `job` e o número do PR — um scan manual não tem PR, e o link some.
 */
/**
 * Onde o patch foi parar.
 *
 * `github_comment_id` é o discriminador: com ele, virou code suggestion e dá
 * para linkar o comentário exato. Sem ele, ou não havia PR (scan de branch),
 * ou o arquivo estava fora do diff — e o GitHub recusa comentário inline aí.
 * Distinguir os dois pelo `pr_number` do scan é exato: só existe PR no
 * primeiro caso.
 */
function toDestino(dto: ApiRemediation): RemediationDestino {
  if (dto.github_comment_id && dto.finding_repo_url && dto.pr_number) {
    return {
      tipo: 'suggestion',
      commentUrl:
        `${repoWebUrl(dto.finding_repo_url)}/pull/${dto.pr_number}` +
        `#discussion_r${dto.github_comment_id}`,
    };
  }
  return dto.pr_number ? { tipo: 'fora-do-diff' } : { tipo: 'sem-pr' };
}

function toItem(dto: ApiRemediation): RemediationItem {
  const severity = toSeverity(dto.finding_severity);

  return {
    id: dto.id,
    finding_id: dto.finding_id,
    scan_job_id: dto.scan_job_id,
    status: toStatus(dto.status),
    explanation: dto.explanation,
    patch_diff: dto.patch_diff,
    requires_secret_rotation: dto.requires_secret_rotation,
    rotation_instructions: dto.rotation_instructions,
    approved_by: dto.approved_by,
    created_at: dto.created_at,
    finding:
      dto.finding_title && severity
        ? {
            id: dto.finding_id,
            title: dto.finding_title,
            severity,
            file_path: dto.finding_file_path ?? '',
            repo_url: dto.finding_repo_url ?? '',
          }
        : undefined,
    job: dto.pr_number ? { pr_number: dto.pr_number } : undefined,
    destino: toDestino(dto),
  };
}

function isApiRemediation(value: unknown): value is ApiRemediation {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ApiRemediation).id === 'string' &&
    typeof (value as ApiRemediation).patch_diff === 'string'
  );
}

async function accessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAMES.access)?.value;
}

/**
 * Busca as remediações do usuário. `scanJobId` escopa a uma execução.
 *
 * Nunca lança: sem API configurada, sem sessão ou com a API fora, devolve
 * `ok: false` e a tela mostra o estado neutro em vez de um erro.
 */
export const fetchRemediations = cache(
  async (scanJobId?: string): Promise<RemediationsResult> => {
    if (!IS_API_CONFIGURED) return FALHOU;

    const token = await accessToken();
    if (!token) return FALHOU;

    try {
      const query = new URLSearchParams({ limit: String(PAGE_LIMIT), offset: '0' });
      if (scanJobId) query.set('scan_job_id', scanJobId);

      const { status, data } = await getApi(`/remediations?${query.toString()}`, token);
      if (status !== 200 || !data || typeof data !== 'object') return FALHOU;

      const page = data as { items?: unknown; total?: unknown };
      if (!Array.isArray(page.items)) return FALHOU;

      const remediations = page.items.filter(isApiRemediation).map(toItem);
      return {
        remediations,
        total: typeof page.total === 'number' ? page.total : remediations.length,
        ok: true,
      };
    } catch {
      return FALHOU;
    }
  },
);
