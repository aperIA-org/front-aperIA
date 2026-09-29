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
 * `../python-api/app/domain/scan/tool_catalog.py`. A análise estática aparece
 * duas vezes porque roda em dois tiers com escopos diferentes, e são duas
 * etapas do ponto de vista de quem lê o pipeline.
 *
 * **O `name` NUNCA é o nome do produto por trás da etapa.** A plataforma não
 * expõe qual scanner roda em cada etapa — o id (que é o contrato com a API)
 * fica só no código, e a tela diz o que a etapa FAZ ("Varredura de
 * credenciais"), não com o quê. Por isso uma ferramenta que a API reporte e o
 * catálogo daqui não conheça vira "Verificação adicional" em vez do id cru:
 * mostrar o id devolveria o nome do produto para a tela, que é exatamente o que
 * esta camada existe para evitar. O id continua na chave do React e nos dados.
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
      name: 'Varredura de credenciais',
      role: 'procura segredos e chaves expostas no diff do commit',
      kind: 'scanner',
    },
    {
      id: 'semgrep-changed',
      name: 'Análise do código alterado',
      role: 'análise estática restrita aos arquivos do commit',
      kind: 'scanner',
    },
  ],
  [
    {
      id: 'trivy',
      name: 'Análise de dependências',
      role: 'CVEs conhecidas em dependências e containers',
      kind: 'scanner',
    },
    {
      id: 'semgrep-full',
      name: 'Análise do código completo',
      role: 'análise estática na árvore inteira do repositório',
      kind: 'scanner',
    },
    {
      id: 'prowler',
      name: 'Postura de nuvem',
      role: 'configuração de nuvem a partir do IaC',
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
      name: 'Teste dinâmico da aplicação',
      role: 'requisições ativas contra a aplicação publicada',
      kind: 'scanner',
      conditional: 'precisa de um alvo de DAST no repositório',
    },
    {
      id: 'threat-intel',
      name: 'Inteligência de ameaças',
      role: 'por CVE: exploração conhecida e probabilidade de ataque',
      kind: 'scanner',
    },
    {
      id: 'caldera',
      name: 'Emulação de adversário',
      role: 'executa as técnicas MITRE ATT&CK contra o alvo',
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
  | 'cancelled'
  | 'queued';

export const TOOL_STATE_LABEL: Record<ToolState, string> = {
  done: 'concluída',
  running: 'em execução',
  failed: 'falhou',
  degraded: 'modo degradado',
  skipped: 'não executada',
  blocked: 'interrompida',
  cancelled: 'cancelada',
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
  // A ferramenta que estava em voo quando alguém parou o scan. Fora daqui ela
  // cairia no piso do tier e voltaria a aparecer "em execução".
  'cancelled',
];

/** Mesma coisa no feminino/masculino do tier — "etapa" é feminina. */
export const TIER_STATE_LABEL: Record<ToolState, string> = {
  done: 'concluído',
  running: 'em execução',
  failed: 'falhou',
  degraded: 'modo degradado',
  skipped: 'não executado',
  blocked: 'interrompido',
  cancelled: 'cancelado',
  queued: 'na fila',
};

/** Estado do tier inteiro — o piso a partir do qual cada ferramenta é derivada. */
export function tierState(job: ScanJob, tierIndex: number): ToolState {
  const status = tierStatusAt(job, tierIndex);
  if (status === 'done') return 'done';
  if (status === 'running') return 'running';
  if (status === 'failed') return 'failed';
  if (status === 'skipped') return 'skipped';
  if (status === 'cancelled') return 'cancelled';

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

  // Ferramenta que a API reportou e o catálogo daqui não conhece: entra com um
  // rótulo genérico. Sumir seria pior — o pipeline rodou alguma coisa e a tela
  // ficaria mentindo por omissão —, mas o id cru é o nome do produto, e a tela
  // não expõe isso (ver o cabeçalho deste módulo).
  const conhecidas = new Set(TIER_TOOLS[tierIndex].map((tool) => tool.id));
  const extras = (runs ?? [])
    .filter((run) => run.tier === tierIndex + 1 && !conhecidas.has(run.tool))
    .map((run): ToolRun => ({
      tool: {
        id: run.tool,
        name: 'Verificação adicional',
        role: 'etapa nova do pipeline',
        kind: 'scanner',
      },
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

/**
 * O desfecho de um passo da cadeia. As quatro opções dizem coisas DIFERENTES, e
 * achatá-las é o erro que esta parte da tela tem que evitar:
 *
 * - `emulado`: a emulação executou o movimento e ele funcionou.
 * - `bloqueado`: a emulação executou e um controle conteve — é uma **defesa que
 *   funcionou**, e vale tanto quanto um passo que passou.
 * - `nao_emulado`: a emulação não teve como tentar (sem alvo de DAST, sem agente).
 * - `projecao`: ninguém executou; a cadeia é inferência do modelo.
 *
 * O `caldera_validated` booleano de `paths` confundia os três últimos num único
 * `false` — "não tentamos" lia igual a "não é possível".
 */
export type ChainOutcome = 'emulado' | 'bloqueado' | 'nao_emulado' | 'projecao';

export const CHAIN_OUTCOME_LABEL: Record<ChainOutcome, string> = {
  emulado: 'emulado ✓',
  bloqueado: 'bloqueado',
  nao_emulado: 'não emulado',
  projecao: 'projeção da IA',
};

/** Um passo de uma cadeia. Tudo opcional: o blob vem de um LLM. */
export type ChainStep = {
  phase: string | null;
  /** Tática MITRE (`TAXXXX`) — o eixo da fase, não a técnica. */
  tactic: string | null;
  technique: string | null;
  /** Onde o passo acontece: `/upload sem auth`, `container como root`. */
  asset: string | null;
  outcome: string | null;
  /** O que se observou, ou por que não se observou. */
  evidence: string | null;
};

export type IaChain = {
  title: string | null;
  severity: string | null;
  steps: ChainStep[];
};

/**
 * Quantos CAMINHOS a I.A encadeou — e quantos PASSOS eles têm.
 *
 * Os dois existem porque a tela os confundia: `ia.paths` é a lista de **passos**
 * de um caminho (o `attack_path` do blob é UM caminho, e cada item tem
 * `"step": <int>`), e quatro lugares contavam `paths.length` chamando de
 * "caminhos". Um scan com 7 passos anunciava "7 caminhos de attack path" na tela
 * de Scans enquanto o relatório, que agrupa por `attack_chains`, mostrava 2 —
 * dois números para a mesma execução, em unidades diferentes.
 *
 * Sem `attack_chains` (relatório antigo), `attack_path` é **um** caminho: a
 * contagem de caminhos é 1 quando há passo, 0 quando não há.
 *
 * ─── Por que os dois contam sobre `iaChains()` ──────────────────────────────
 *
 * `attack_path` e `attack_chains` são duas representações do MESMO blob e **não
 * batem em contagem**: numa execução real a lista plana tinha 11 passos e os
 * `steps` das 2 cadeias somavam 12. Não dá para reconciliar — o modelo produziu
 * as duas.
 *
 * `iaChains()` é a normalização única, e é o que as telas desenham. Contar por
 * fora dela é como o bug nasceu: o card de Scans dizia "2 caminhos" no cabeçalho
 * e desenhava 11 itens numerados logo abaixo. Nenhuma tela pode desenhar uma
 * representação e contar a outra.
 */
export function iaPathCount(ia: ScanIaSummary | null | undefined): number {
  return iaChains(ia).length;
}

export function iaStepCount(ia: ScanIaSummary | null | undefined): number {
  return iaChains(ia).reduce((soma, chain) => soma + (chain.steps ?? []).length, 0);
}

/** Desfechos que a UI sabe desenhar; qualquer outro cai em "projeção". */
export const OUTCOMES: readonly ChainOutcome[] = [
  'emulado',
  'bloqueado',
  'nao_emulado',
  'projecao',
];

/**
 * Normaliza o `outcome` de um passo.
 *
 * Mora aqui, e não no componente, porque as DUAS telas classificam desfecho — e
 * "desconhecido vira projeção" é uma afirmação sobre o dado, não sobre o
 * desenho: `projecao` é o único desfecho que não alega nada sobre execução.
 */
export function outcomeOf(value: string | null): ChainOutcome {
  return (OUTCOMES as readonly string[]).includes(value ?? '')
    ? (value as ChainOutcome)
    : 'projecao';
}

/** `emulado` é o único desfecho em que o movimento de fato passou. */
export function chainEmulated(chain: IaChain): { ok: number; total: number } {
  const steps = chain.steps ?? [];
  return {
    ok: steps.filter((s) => s.outcome === 'emulado').length,
    total: steps.length,
  };
}

/**
 * O nome de uma cadeia.
 *
 * O fallback precisa ser o MESMO nas duas telas: a cadeia sem título vira
 * "Caminho 2" no card de Scans e tem de continuar "Caminho 2" no relatório,
 * senão o usuário não reconhece a linha em que clicou.
 */
export function chainTitle(chain: IaChain, index: number): string {
  return chain.title ?? `Caminho ${index + 1}`;
}

/**
 * "1 de 3 emulados · restante teórico".
 *
 * A concordância é com o TOTAL, não com o contador. E a frase é decisão de
 * produto, não formatação: o que não foi emulado não deixa de ser caminho, mas
 * também não foi provado — por isso ela vive aqui e não dentro de uma tela.
 */
export function chainEmulatedPhrase(chain: IaChain): string {
  const { ok, total } = chainEmulated(chain);
  const teorico = total - ok;
  return (
    `${ok} de ${total} ${total === 1 ? 'emulado' : 'emulados'}` +
    (teorico > 0 ? ' · restante teórico' : ' na emulação')
  );
}

/**
 * Os números do attack path, TODOS derivados da mesma estrutura.
 *
 * Existe porque o card de Scans tirava `caminhos`/`passos` das cadeias e
 * `fases`/`validados` da lista plana, na mesma frase. Com `chains` presente e
 * `paths` vazio isso produzia "2 caminhos em 12 passos, atravessando 0 fases", e
 * o `validados === passos` comparava valores de bases diferentes.
 *
 * Uma passada só: a tela de Scans é uma lista de cards e chama isto por card.
 */
export function iaChainStats(ia: ScanIaSummary | null | undefined): {
  caminhos: number;
  passos: number;
  fases: number;
  emulados: number;
  outcomes: Record<ChainOutcome, number>;
} {
  const chains = iaChains(ia);
  const fases = new Set<string>();
  const outcomes: Record<ChainOutcome, number> = {
    emulado: 0,
    bloqueado: 0,
    nao_emulado: 0,
    projecao: 0,
  };
  let passos = 0;

  for (const chain of chains) {
    for (const step of chain.steps ?? []) {
      passos += 1;
      // `phase` é `string | null`: uma fase ausente não conta como fase, e `''`
      // entraria no Set como se fosse uma.
      if (step.phase) fases.add(step.phase);
      outcomes[outcomeOf(step.outcome)] += 1;
    }
  }

  return {
    caminhos: chains.length,
    passos,
    fases: fases.size,
    emulados: outcomes.emulado,
    outcomes,
  };
}

/**
 * As cadeias a desenhar, com fallback para a lista plana.
 *
 * Relatório anterior ao `attack_chains` só tem `paths`: viram **uma** cadeia sem
 * título, e um passo não validado pelo Caldera é `projecao` — que é a verdade
 * disponível ali, já que o booleano não distingue "não tentamos" de "contido".
 */
export function iaChains(ia: ScanIaSummary | null | undefined): IaChain[] {
  if (!ia) return [];
  /*
   * `?? []` mesmo com o tipo dizendo que existe: `ia` chega de um cast em
   * `fetchScanTools`, não de validação campo a campo. Uma API mais antiga que o
   * front (janela de deploy) não manda `chains`, e `undefined.length` derrubaria
   * a seção inteira.
   */
  const chains = ia.chains ?? [];
  if (chains.length > 0) return chains;
  const paths = ia.paths ?? [];
  if (paths.length === 0) return [];
  return [
    {
      title: null,
      severity: null,
      steps: paths.map((path) => ({
        phase: path.phase,
        tactic: null,
        technique: path.technique,
        asset: null,
        outcome: path.caldera_validated ? 'emulado' : 'projecao',
        evidence: path.description,
      })),
    },
  ];
}

export type ScanIaSummary = {
  degraded: boolean;
  reason: string | null;
  kill_chain_complete: boolean;
  risk_level: string | null;
  risk_score: number | null;
  paths: IaPath[];
  /** As cadeias agrupadas. Vazio em relatório anterior a `attack_chains`. */
  chains: IaChain[];
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
  /**
   * A leitura executiva do Tier 3 — o que decidir sobre este commit.
   *
   * `recommendation` é um enum curto de propósito: a tela colore e prioriza por
   * ele, em vez de procurar a decisão dentro da `headline`.
   *
   * Os três blocos abaixo chegaram depois do resto do resumo, então **`null` é o
   * caso comum**: relatório gerado antes desta versão do prompt, ou execução
   * degradada em que o Claude não respondeu. `null` significa "ninguém
   * calculou" — e é isso que a tela diz, nunca um valor de fachada.
   */
  verdict: { recommendation: string | null; headline: string | null } | null;
  /** Esforço de correção, derivado dos próprios findings (não de sprint). */
  effort: { level: string | null; label: string | null } | null;
  /** Prazo em dias corridos a partir da análise, com o texto já formatado. */
  deadline: { days: number | null; label: string | null } | null;
  /**
   * A tradução do risco técnico para quem decide.
   *
   * O prompt do Tier 3 é instruído a escrever isto **sem jargão** — sem CVE, sem
   * TTP, sem nome de ferramenta —, porque o público é quem aprova o merge, não
   * quem lê o finding. `area` e `severity` são enums curtos para a tela colorir e
   * ordenar; o resto é texto para o humano.
   *
   * `null` = ninguém traduziu (relatório anterior a esta versão do prompt, ou
   * execução degradada). A tela some com o card em vez de inventar impacto.
   */
  impact: {
    headline: string | null;
    areas: {
      /** `dados` | `propriedade_intelectual` | `entrega` | … — ou um id novo. */
      area: string | null;
      /** `critico` | `alto` | `medio` | `baixo`. */
      severity: string | null;
      title: string | null;
      detail: string | null;
    }[];
    if_fixed_now: ImpactNote | null;
    if_deferred: ImpactNote | null;
    /** Só quando os dados envolvidos implicam obrigação legal de fato. */
    regulatory: ImpactNote | null;
  } | null;
};

/** Um par título/detalhe da faixa de consequências do impacto ao negócio. */
export type ImpactNote = { headline: string | null; detail: string | null };

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
    partes.push(
      ia.cti.known_exploited
        ? 'CVE com exploração conhecida'
        : 'nenhum CVE com exploração conhecida',
    );
    if (ia.cti.epss_score != null)
      partes.push(`probabilidade de exploração ${ia.cti.epss_score}`);
  }
  if (tool.id === 'caldera' && ia?.caldera) {
    const { techniques_executed: exec, techniques_successful: ok, ttps } = ia.caldera;
    if (exec > 0) partes.push(`${ok}/${exec} técnicas emuladas`);
    if (ttps.length > 0) partes.push(ttps.join(' → '));
  }
  if (tool.id === 'ia-tier3' && ia && !ia.degraded) {
    // CAMINHOS, não passos: `paths.length` é a contagem de passos, e usá-la aqui
    // dizia "7 caminhos de ataque" para um caminho de 7 passos.
    const n = iaPathCount(ia);
    const passos = iaStepCount(ia);
    partes.push(
      n === 0
        ? 'nenhum caminho encadeado'
        : `${n} caminho${n === 1 ? '' : 's'} de ataque em ${passos} passo${passos === 1 ? '' : 's'}`,
    );
  }

  if (dur) partes.push(dur);
  return partes.join(' · ');
}

/**
 * Em que etapa o cancelamento pegou o pipeline.
 *
 * Ao cancelar, TODAS as etapas pendentes viram `cancelled` de uma vez — a que
 * estava rodando e as que nem tinham começado. O que as separa é o início:
 * `tierN_started_at` só é gravado quando a etapa entra em execução, então a
 * etapa cancelada COM início é onde o trabalho foi interrompido, e as sem
 * início nunca chegaram a abrir.
 *
 * É o que permite a tela dizer "cancelado durante a análise de dependências"
 * em vez de só "cancelado" — sem precisar de uma coluna para guardar isso.
 *
 * `null` quando nada havia começado: cancelado ainda na fila.
 */
export function tierDoCancelamento(job: ScanJob): number | null {
  const inicios = job.tier_started_at ?? [];
  for (let i = 2; i >= 0; i -= 1) {
    if (tierStatusAt(job, i) === 'cancelled' && inicios[i]) return i;
  }
  return null;
}
