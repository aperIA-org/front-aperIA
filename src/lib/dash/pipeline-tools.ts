import type { ScanJob, TierStatus } from './types';

/**
 * Catálogo das ferramentas que cada tier do pipeline executa, e a derivação do
 * estado de cada uma a partir de um `ScanJob`.
 *
 * DUAS FONTES, NESTA ORDEM DE AUTORIDADE:
 *
 * 1. **`GET /scans/{id}/tools`** (`fetchScanTools`) — o desfecho real de cada
 *    ferramenta, gravado pela API em `scan_tool_runs`. É a fonte boa: separa
 *    "rodou e não achou nada" de "quebrou", traz duração, contagem e o motivo
 *    de cada pulo. Onde existe linha, ela manda.
 * 2. **O status do tier** (`ScanJob.tier{1,2,3}_status`) — o piso, usado onde
 *    não há linha. Isso acontece em três casos legítimos: o pipeline ainda não
 *    chegou àquela ferramenta, a execução é anterior à migration que criou a
 *    tabela (nada foi backfillado), ou estamos em modo demonstração.
 *
 * Nunca o contrário: uma linha real jamais é sobrescrita pela dedução do tier.
 *
 * Os ids em `TIER_TOOLS` são o contrato com a API e precisam bater com
 * `../python-api/app/domain/scan/tool_catalog.py`. O Semgrep aparece duas vezes
 * porque roda em dois tiers com escopos diferentes, e são duas ferramentas do
 * ponto de vista de quem lê o pipeline. Uma ferramenta que a API reporte e o
 * catálogo daqui não conheça ainda aparece na tela, com o id cru como nome —
 * some é pior que feio.
 *
 * A ordem das listas espelha a ordem real do canvas do Celery
 * (`../python-api/docs/explicacao-pipeline.md` §2).
 */

/** `analise` = etapa de I.A/enriquecimento; `scanner` = varredura propriamente. */
export type ToolKind = 'scanner' | 'analise';

export type PipelineTool = {
  id: string;
  name: string;
  /** O que a ferramenta faz, em uma linha — vai para o tooltip. */
  role: string;
  kind: ToolKind;
  /** Condição para a ferramenta rodar, quando ela não roda sempre. */
  conditional?: string;
};

/** Uma lista por tier, no índice do tier (0 = Tier 1). */
export const TIER_TOOLS: readonly (readonly PipelineTool[])[] = [
  [
    {
      id: 'trufflehog',
      name: 'TruffleHog',
      role: 'secrets verificados no diff do commit',
      kind: 'scanner',
    },
    {
      id: 'semgrep-changed',
      name: 'Semgrep changed',
      role: 'SAST restrito aos arquivos alterados',
      kind: 'scanner',
    },
  ],
  [
    {
      id: 'trivy',
      name: 'Trivy',
      role: 'SCA, CVEs em dependências e containers',
      kind: 'scanner',
    },
    {
      id: 'semgrep-full',
      name: 'Semgrep full',
      role: 'SAST na árvore inteira do repositório',
      kind: 'scanner',
    },
    {
      id: 'prowler',
      name: 'Prowler',
      role: 'postura de cloud a partir do IaC',
      kind: 'scanner',
      conditional: 'só roda quando o commit altera arquivos de IaC',
    },
    {
      id: 'ia-tier2',
      name: 'I.A · cadeia de eventos',
      role: 'correlaciona os findings e calcula o risk score',
      kind: 'analise',
    },
  ],
  [
    {
      id: 'zap',
      name: 'OWASP ZAP',
      role: 'DAST ativo contra a aplicação publicada',
      kind: 'scanner',
      conditional: 'precisa de um alvo de DAST no repositório',
    },
    {
      id: 'threat-intel',
      name: 'CISA KEV + EPSS',
      role: 'threat intel por CVE: exploração conhecida e probabilidade',
      kind: 'scanner',
    },
    {
      id: 'caldera',
      name: 'Caldera',
      role: 'emulação de adversário sobre as técnicas MITRE ATT&CK',
      kind: 'scanner',
    },
    {
      id: 'ia-tier3',
      name: 'I.A · attack path',
      role: 'monta o caminho de ataque e o relatório final',
      kind: 'analise',
    },
  ],
] as const;

/**
 * Estado de uma ferramenta na execução.
 *
 * `skipped` e `blocked` são coisas diferentes e a UI as separa: `skipped` é "o
 * gate decidiu que este tier não era necessário" (caminho feliz — nada de
 * severidade alta), `blocked` é "o pipeline foi interrompido antes de chegar
 * aqui" (secret verificado no Gate 1).
 */
export type ToolState =
  | 'done'
  | 'running'
  | 'failed'
  | 'degraded'
  | 'skipped'
  | 'blocked'
  | 'queued';

export const TOOL_STATE_LABEL: Record<ToolState, string> = {
  done: 'concluída',
  running: 'em execução',
  failed: 'falhou',
  degraded: 'modo degradado',
  skipped: 'não executada',
  blocked: 'interrompida',
  queued: 'na fila',
};

/** Estados que a API devolve em `status`. Qualquer outro cai para o piso. */
const API_STATES: readonly string[] = [
  'done',
  'running',
  'failed',
  'degraded',
  'skipped',
  'queued',
];

/** Mesma coisa no feminino/masculino do tier — "etapa" é feminina. */
export const TIER_STATE_LABEL: Record<ToolState, string> = {
  done: 'concluído',
  running: 'em execução',
  failed: 'falhou',
  degraded: 'modo degradado',
  skipped: 'não executado',
  blocked: 'interrompido',
  queued: 'na fila',
};

/** Estado do tier inteiro — o piso a partir do qual cada ferramenta é derivada. */
export function tierState(job: ScanJob, tierIndex: number): ToolState {
  const status = tierStatusAt(job, tierIndex);
  if (status === 'done') return 'done';
  if (status === 'running') return 'running';
  if (status === 'failed') return 'failed';
  if (status === 'skipped') return 'skipped';

  // `null`: ou o tier ainda não começou, ou nunca vai começar porque um gate
  // anterior parou a chain. `blocked_at_tier` é o número do GATE (1 = entre
  // Tier 1 e Tier 2), então todo tier acima dele foi interrompido.
  if (job.blocked_at_tier != null && tierIndex + 1 > job.blocked_at_tier) return 'blocked';
  return 'queued';
}

/**
 * Por que um tier ficou `skipped` — a API grava a DECISÃO, mas não o motivo.
 *
 * Ele é recuperável sem ambiguidade porque só existem dois pontos no pipeline
 * que chamam `mark_tier_skipped` (`../python-api/app/presentation/workers/
 * analysis_worker.py`):
 *
 * - **Gate 1** (`gate1_check`) bloqueou por secret verificado e pulou os tiers
 *   2 **e** 3 de uma vez — e nesse caso grava `blocked_at_tier = 1`.
 * - **Gate 2** (`tier3_gate`) decidiu não escalar porque nem a severidade
 *   máxima nem o risco agregado chegaram a `high` — pula só o Tier 3, e
 *   `blocked_at_tier` fica `null`.
 *
 * Então `skipped` + `blocked_at_tier == null` é, necessariamente, o Gate 2.
 * Sem essa distinção o Tier 3 pulado ficava visualmente igual a "ainda não
 * chegou nesse tier", que é justamente o que a API tomou o cuidado de não
 * deixar acontecer ao persistir o `skipped`.
 */
function tierStatusAt(job: ScanJob, tierIndex: number): TierStatus {
  return [job.tier1_status, job.tier2_status, job.tier3_status][tierIndex] ?? null;
}

export type SkipReason = 'gate2-sem-escalada' | 'gate1-bloqueado' | null;

/**
 * Por que ESTE tier ficou `skipped`. Só os tiers 2 e 3 podem ficar.
 *
 * O Tier 2 pulado só tem uma origem possível (o Gate 1); o Tier 3 tem duas, e é
 * o `blocked_at_tier` que as separa.
 */
export function tierSkipReason(job: ScanJob, tierIndex: number): SkipReason {
  if (tierStatusAt(job, tierIndex) !== 'skipped') return null;
  if (tierIndex === 1) return 'gate1-bloqueado';
  if (tierIndex !== 2) return null;
  return job.blocked_at_tier != null ? 'gate1-bloqueado' : 'gate2-sem-escalada';
}

/** Frase curta, para o cabeçalho da coluna do tier. */
export const SKIP_REASON_SHORT: Record<NonNullable<SkipReason>, string> = {
  'gate2-sem-escalada': 'Gate 2 não escalou',
  'gate1-bloqueado': 'Gate 1 bloqueou',
};

/** Explicação completa, para a linha visível e para os tooltips. */
export const SKIP_REASON_LONG: Record<NonNullable<SkipReason>, string> = {
  'gate2-sem-escalada':
    'O Tier 2 não encontrou nada com severidade high ou critical, e o risco agregado também ficou abaixo desse limiar — então o Gate 2 não escalou para a análise profunda. Nenhuma ferramenta desta etapa rodou.',
  'gate1-bloqueado':
    'O Gate 1 encontrou um secret verificado e interrompeu o pipeline. Nenhuma ferramenta desta etapa rodou.',
};

export type ToolRun = {
  tool: PipelineTool;
  state: ToolState;
  /** Motivo, já traduzido, quando existe um. */
  reason?: string;
  /** `0` é um dado — "rodou e não achou nada". `undefined` é "não sabemos". */
  findingsCount?: number;
  durationMs?: number;
  /** `true` quando o estado veio de `scan_tool_runs`, não do status do tier. */
  real?: boolean;
};

/** O DTO de `GET /scans/{id}/tools`, na forma mínima que esta camada usa. */
export type ToolRunDto = {
  tier: number;
  tool: string;
  status: string;
  reason: string | null;
  findings_count: number | null;
  duration_ms: number | null;
};

/**
 * Motivos que a API grava como código, traduzidos para a tela.
 *
 * Eles são estáveis (vêm dos workers, não de texto livre), então a tradução é
 * uma tabela. Um motivo desconhecido — o tipo de uma exceção, por exemplo — é
 * mostrado como veio: um código cru diz mais do que nada.
 */
const API_REASON_PT: Record<string, string> = {
  no_iac_files: 'o commit não altera arquivos de IaC',
  no_target_url: 'repositório sem alvo de DAST configurado',
  gate1_secret_verificado: 'Gate 1 bloqueou, secret verificado no commit',
  gate2_abaixo_do_limiar: 'Gate 2 não escalou, severidade abaixo de high',
  sem_cves: 'nenhum CVE nos findings do Tier 2 para enriquecer',
  cti_indisponivel: 'as fontes de threat intel não responderam',
};

function reasonPt(reason: string | null): string | undefined {
  if (!reason) return undefined;
  return API_REASON_PT[reason] ?? reason;
}

function toToolState(status: string): ToolState | null {
  return API_STATES.includes(status) ? (status as ToolState) : null;
}

/**
 * As ferramentas de um tier com o estado de cada uma nesta execução.
 *
 * `runs` são as linhas reais de `scan_tool_runs`; onde existe uma, ela manda.
 * `targetUrl` é o alvo de DAST do repositório e só entra como **suposição de
 * fallback** para o ZAP, quando a API não reportou nada: `null` = repositório
 * monitorado sem alvo, `undefined` = não sabemos (repositório fora da lista, ou
 * demonstração) e aí nada é afirmado.
 */
export function tierToolRuns(
  job: ScanJob,
  tierIndex: number,
  opts: { targetUrl?: string | null; runs?: ToolRunDto[] } = {},
): ToolRun[] {
  const { targetUrl, runs } = opts;
  const base = tierState(job, tierIndex);
  const skipReason = tierSkipReason(job, tierIndex);
  const byTool = new Map((runs ?? []).map((run) => [run.tool, run]));

  const known = TIER_TOOLS[tierIndex].map((tool): ToolRun => {
    const dto = byTool.get(tool.id);
    const state = dto ? toToolState(dto.status) : null;

    // Linha real: é o desfecho de verdade, e nada aqui pode contradizê-la.
    if (dto && state) {
      return {
        tool,
        state,
        reason: reasonPt(dto.reason),
        findingsCount: dto.findings_count ?? undefined,
        durationMs: dto.duration_ms ?? undefined,
        real: true,
      };
    }

    // Sem linha: o status do tier é o piso. O ZAP é o único caso em que o front
    // tem dado próprio para contradizê-lo — sem `target_url`, `run_tier3_scan`
    // pula a varredura e o Tier 3 fecha como `done` do mesmo jeito.
    if (tool.id === 'zap' && targetUrl === null && (base === 'done' || base === 'running')) {
      return { tool, state: 'skipped', reason: API_REASON_PT.no_target_url };
    }
    if (base === 'skipped' && skipReason) {
      return { tool, state: 'skipped', reason: SKIP_REASON_SHORT[skipReason].toLowerCase() };
    }
    return { tool, state: base };
  });

  // Ferramenta que a API reportou e o catálogo daqui não conhece: entra com o
  // id cru como nome. Sumir seria pior — o pipeline rodou alguma coisa e a tela
  // ficaria mentindo por omissão.
  const conhecidas = new Set(TIER_TOOLS[tierIndex].map((tool) => tool.id));
  const extras = (runs ?? [])
    .filter((run) => run.tier === tierIndex + 1 && !conhecidas.has(run.tool))
    .map((run): ToolRun => ({
      tool: { id: run.tool, name: run.tool, role: 'ferramenta nova do pipeline', kind: 'scanner' },
      state: toToolState(run.status) ?? 'queued',
      reason: reasonPt(run.reason),
      findingsCount: run.findings_count ?? undefined,
      durationMs: run.duration_ms ?? undefined,
      real: true,
    }));

  return [...known, ...extras];
}

/* ═══════════════════════ camada I.A do Tier 3 ═══════════════════════ */

/**
 * Resumo compacto da camada I.A, de `GET /scans/{id}/tools` → `ia`.
 *
 * Vem do `analysis_json` do relatório de Tier 3, montado no servidor. O blob
 * completo carrega o array inteiro de findings com `raw_output` — centenas de
 * KB por execução —, então o que chega aqui é só o que a tela usa.
 *
 * `finding_count` por caminho é a contagem, não a lista: os `finding_ids` do
 * blob são frases longas em português, inúteis para a UI e caras no payload.
 */
export type IaPath = {
  step: number;
  phase: string;
  technique: string;
  description: string;
  finding_count: number;
  caldera_validated: boolean;
};

export type ScanIaSummary = {
  degraded: boolean;
  reason: string | null;
  kill_chain_complete: boolean;
  risk_level: string | null;
  risk_score: number | null;
  paths: IaPath[];
  cti: {
    status: string | null;
    known_exploited: boolean;
    epss_score: number | null;
    active_threat: boolean;
    mitre_techniques: string[];
  } | null;
  caldera: {
    status: string | null;
    techniques_executed: number;
    techniques_successful: number;
    validated: boolean;
    partial: boolean;
    ttps: string[];
  } | null;
};

/** Fases MITRE em português — o blob devolve o id em inglês e snake_case. */
const PHASE_PT: Record<string, string> = {
  reconnaissance: 'reconhecimento',
  resource_development: 'preparação',
  initial_access: 'acesso inicial',
  execution: 'execução',
  persistence: 'persistência',
  privilege_escalation: 'escalada de privilégio',
  defense_evasion: 'evasão de defesa',
  credential_access: 'acesso a credenciais',
  discovery: 'descoberta',
  lateral_movement: 'movimento lateral',
  collection: 'coleta',
  command_and_control: 'comando e controle',
  exfiltration: 'exfiltração',
  impact: 'impacto',
};

export function phasePt(phase: string): string {
  return PHASE_PT[phase] ?? phase.replace(/_/g, ' ');
}

/* ═══════════════════════ agregados por tier ═══════════════════════ */

/** Estados em que a ferramenta de fato executou (pulada não conta). */
const RAN: readonly ToolState[] = ['done', 'failed', 'degraded'];

/**
 * `2/4` de um tier: quantas ferramentas RODARAM sobre o total do catálogo.
 *
 * Pulada não entra no numerador de propósito — "3/4" com o Prowler pulado diz a
 * verdade, e "4/4" diria que tudo rodou.
 */
export function tierProgress(runs: ToolRun[]): { ran: number; total: number } {
  return { ran: runs.filter((r) => RAN.includes(r.state)).length, total: runs.length };
}

/** Mesma contagem, somando os três tiers — é o número do rodapé do card. */
export function pipelineProgress(all: ToolRun[][]): { ran: number; total: number } {
  return all.reduce(
    (acc, runs) => {
      const { ran, total } = tierProgress(runs);
      return { ran: acc.ran + ran, total: acc.total + total };
    },
    { ran: 0, total: 0 },
  );
}

/** "820ms", "4s", "6m 12s" — a API dá milissegundos. */
export function fmtToolDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

/**
 * A linha de detalhe de uma ferramenta.
 *
 * TUDO aqui sai de campo real — contagem de findings, duração, motivo do pulo,
 * e para as três ferramentas do Tier 3 os números do `analysis_json`. O mockup
 * pedia prosa do tipo "14 arquivos varridos · regras OWASP Top 10"; nada disso
 * é persistido pelo pipeline, então não é inventado aqui. Ver o cabeçalho deste
 * módulo: onde não há dado, a tela mostra menos, não mais.
 */
export function toolDetail(run: ToolRun, ia?: ScanIaSummary | null): string {
  const { tool, state, reason, findingsCount, durationMs } = run;
  const dur = durationMs === undefined ? null : fmtToolDuration(durationMs);

  if (state === 'skipped') return `Pulado${reason ? ` — ${reason}` : ''}`;
  if (state === 'blocked') return `Interrompido${reason ? ` — ${reason}` : ''}`;
  if (state === 'queued') return 'Aguardando a vez na fila';
  if (state === 'failed') return `Falhou${reason ? ` — ${reason}` : ''}`;
  if (state === 'running') return 'Em execução…';

  // Daqui pra baixo: `done` ou `degraded`.
  const partes: string[] = [];

  if (state === 'degraded') {
    partes.push(`Caiu para a heurística${reason ? ` (${reason})` : ''}`);
  } else if (findingsCount !== undefined) {
    partes.push(
      findingsCount === 0
        ? 'Nada encontrado'
        : `${findingsCount} finding${findingsCount === 1 ? '' : 's'}`,
    );
  }

  // Enriquecimento por ferramenta, só com o que o `analysis_json` traz.
  if (tool.id === 'threat-intel' && ia?.cti) {
    partes.push(ia.cti.known_exploited ? 'CVE no catálogo KEV' : 'nenhum CVE no KEV');
    if (ia.cti.epss_score != null) partes.push(`EPSS ${ia.cti.epss_score}`);
  }
  if (tool.id === 'caldera' && ia?.caldera) {
    const { techniques_executed: exec, techniques_successful: ok, ttps } = ia.caldera;
    if (exec > 0) partes.push(`${ok}/${exec} técnicas emuladas`);
    if (ttps.length > 0) partes.push(ttps.join(' → '));
  }
  if (tool.id === 'ia-tier3' && ia && !ia.degraded) {
    const n = ia.paths.length;
    partes.push(n === 0 ? 'nenhum caminho encadeado' : `${n} caminho${n === 1 ? '' : 's'} de ataque`);
  }

  if (dur) partes.push(dur);
  return partes.join(' · ');
}
