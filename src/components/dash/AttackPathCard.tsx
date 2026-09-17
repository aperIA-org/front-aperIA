import { TIER_META } from '@/lib/dash/format';
import {
  CHAIN_OUTCOME_LABEL,
  OUTCOMES,
  SKIP_REASON_LONG,
  TOOL_STATE_LABEL,
  chainEmulatedPhrase,
  chainTitle,
  iaChains,
  outcomeOf,
  phasePt,
  tierProgress,
  tierSkipReason,
  tierState,
  tierToolRuns,
  toolDetail,
  type ChainOutcome,
  type ChainStep,
  type IaChain,
  type ScanIaSummary,
  type ToolRun,
  type ToolRunDto,
  type ToolState,
} from '@/lib/dash/pipeline-tools';
import type { ScanJob } from '@/lib/dash/types';
import { IconCheck, IconSpin } from './ScanPipeline';

/**
 * O Tier 3 desta execução: os caminhos de ataque, ou onde a simulação está.
 *
 * É o card que substitui, nesta tela, o trilho lateral da tela de Scans. O
 * desenho é outro de propósito: aqui o trilho é **centralizado** — etapa à
 * esquerda, nó no meio, desfecho à direita —, porque este card é o assunto da
 * página, não um resumo do pipeline. O Tier 3 é o diferencial do produto
 * (correlacionar achados com adversary emulation e I.A), e ganha a cor da camada
 * I.A: indigo, **nunca** o vermelho da marca, que nesta interface significa
 * severidade.
 *
 * **Os quatro passos SÃO as quatro ferramentas do tier** (`TIER_TOOLS[2]`), com
 * o estado real de cada uma em `scan_tool_runs`. O pipeline não expõe sub-etapas
 * dentro da chamada ao Claude, então um checklist inventado ou uma barra de
 * progresso interna seriam encenação. A barra do topo conta ferramentas da
 * etapa, e `tierProgress` não põe pulada no numerador: "3 de 4" com o ZAP pulado
 * diz a verdade, "4 de 4" diria que tudo rodou.
 */

/** O que cada ferramenta do Tier 3 faz, na frase curta do trilho. */
const PASSO: Record<string, { nm: string; sub: string }> = {
  zap: { nm: 'Mapear superfície exposta', sub: 'DAST ativo · rotas e entrypoints' },
  'threat-intel': { nm: 'Correlacionar CVEs', sub: 'CISA KEV + EPSS' },
  caldera: { nm: 'Emulação adversária', sub: 'Caldera · MITRE ATT&CK' },
  'ia-tier3': { nm: 'Gerar e ranquear caminhos', sub: 'I.A attack path' },
};

function IconBolt({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="var(--ia-on)" width={size} height={size} aria-hidden="true">
      <path d="M13 2L4.5 13.5H10l-1 8.5 8.5-11.5H12l1-8.5z" />
    </svg>
  );
}

function IconX({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" width={size} height={size} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** O nó do passo, um desenho por estado. */
function StepNode({ state }: { state: ToolState }) {
  if (state === 'running') {
    return (
      <span className="apc-node" data-s="running">
        <IconSpin size={24} color="var(--ia-strong)" />
      </span>
    );
  }
  return (
    <span className="apc-node" data-s={state}>
      {state === 'done' ? (
        <IconCheck size={12} color="var(--ia-on)" />
      ) : state === 'degraded' ? (
        <span style={{ lineHeight: 1 }}>!</span>
      ) : state === 'failed' ? (
        <IconX />
      ) : state === 'skipped' || state === 'blocked' ? (
        <span aria-hidden="true">—</span>
      ) : null}
    </span>
  );
}

function Step({
  run,
  ia,
  last,
}: {
  run: ToolRun;
  ia: ScanIaSummary | null;
  last: boolean;
}) {
  const passo = PASSO[run.tool.id] ?? { nm: run.tool.name, sub: run.tool.role };

  return (
    <div className="apc-step" data-s={run.state}>
      <div className="apc-step-l">
        <div className="apc-step-nm">{passo.nm}</div>
        <div className="apc-step-sub">{passo.sub}</div>
      </div>

      <div className="apc-step-rail">
        <StepNode state={run.state} />
        {/* Só entre dois nós: no último passo o conector sobraria. */}
        {!last && <span className="apc-step-line" />}
      </div>

      <div className="apc-step-r">
        <span className="apc-badge" data-s={run.state}>
          {run.state === 'running' && <IconSpin size={7} color="var(--ia-on)" />}
          {TOOL_STATE_LABEL[run.state]}
        </span>
        <div className="apc-step-dt">{toolDetail(run, ia)}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════ as cadeias ═══════════════════════ */

function IconCircleX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" width="11" height="11" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Um passo da cadeia: fase à esquerda, nó no meio, desfecho à direita. */
function ChainStepRow({ step, last }: { step: ChainStep; last: boolean }) {
  const outcome = outcomeOf(step.outcome);
  /* A tática (`TAXXXX`) é o eixo da fase e é o que o passo tem de mais estável;
     a técnica entra depois, e o `asset` diz ONDE — juntos são a linha mono. */
  const meta = [step.tactic ?? step.technique, step.asset].filter(Boolean).join(' · ');

  return (
    <div className="apc-cstep" data-o={outcome}>
      <div className="apc-step-l">
        <div className="apc-cstep-nm">
          {step.phase ? phasePt(step.phase) : (step.technique ?? 'passo')}
        </div>
        {meta ? <div className="apc-cstep-mt">{meta}</div> : null}
      </div>

      <div className="apc-step-rail">
        <span className="apc-cnode" data-o={outcome}>
          {outcome === 'emulado' ? (
            <IconCheck size={12} color="#fff" />
          ) : outcome === 'bloqueado' ? (
            <IconCircleX />
          ) : null}
        </span>
        {/* Só entre dois nós: no último passo o conector sobraria. */}
        {!last && <span className="apc-cline" />}
      </div>

      <div className="apc-step-r">
        <span className="apc-cbadge" data-o={outcome}>
          {CHAIN_OUTCOME_LABEL[outcome]}
        </span>
        {step.evidence ? <div className="apc-cstep-ev">{step.evidence}</div> : null}
      </div>
    </div>
  );
}

/**
 * Uma cadeia: cabeçalho com número, título, severidade e quantos passos o
 * Caldera de fato emulou.
 *
 * "1 de 3 emulados · restante teórico" é a frase honesta: o que não foi emulado
 * não deixa de ser um caminho, mas também não foi provado.
 */
function Chain({ chain, index }: { chain: IaChain; index: number }) {

  return (
    <div className="apc-chain" data-sev={chain.severity ?? undefined}>
      <div className="apc-chain-hd">
        <span className="apc-chain-n">{index + 1}</span>
        <span className="apc-chain-nm">{chainTitle(chain, index)}</span>
        {chain.severity ? (
          <span className="sevtag" data-sev={sevTagOf(chain.severity)}>
            {chain.severity}
          </span>
        ) : null}
        <span className="apc-chain-ct">{chainEmulatedPhrase(chain)}</span>
      </div>

      {/* `?? []` pelo mesmo motivo de `iaChains`/`chainEmulated`: `ia` vem de
          cast, não de validação campo a campo, e uma API mais antiga que o front
          derrubaria a cadeia inteira aqui. */}
      {(chain.steps ?? []).map((step, i) => (
        <ChainStepRow
          key={`${step.phase ?? ''}-${step.technique ?? ''}-${i}`}
          step={step}
          last={i === (chain.steps ?? []).length - 1}
        />
      ))}
    </div>
  );
}

/** A severidade da cadeia vem em PT (`critico`…); a `.sevtag` colore por ela. */
function sevTagOf(value: string): string | undefined {
  return ['critico', 'alto', 'medio', 'baixo'].includes(value) ? value : undefined;
}

/** Legenda: só os desfechos que aparecem de fato nas cadeias desta execução. */
function Legend({ chains }: { chains: IaChain[] }) {
  const presentes = new Set(
    chains.flatMap((chain) => chain.steps.map((step) => outcomeOf(step.outcome))),
  );
  const cores: Record<ChainOutcome, string> = {
    emulado: '#22c55e',
    bloqueado: 'var(--sev-critical)',
    nao_emulado: 'var(--border-strong)',
    projecao: 'var(--border-strong)',
  };
  const rotulos: Record<ChainOutcome, string> = {
    emulado: 'emulado',
    bloqueado: 'contido',
    nao_emulado: 'não emulado',
    projecao: 'projeção',
  };
  const itens = OUTCOMES.filter((o) => presentes.has(o));
  if (itens.length === 0) return null;

  return (
    <span className="apc-legend">
      {itens.map((o) => (
        <span key={o}>
          <i style={{ background: cores[o] }} />
          {rotulos[o]}
        </span>
      ))}
    </span>
  );
}

export function AttackPathCard({
  job,
  runs,
  ia,
  targetUrl,
}: {
  job: ScanJob;
  /** Linhas de `GET /scans/{id}/tools`. Ausente → cai para o status do tier. */
  runs?: ToolRunDto[];
  /** `null` = sem relatório de Tier 3 (execução em andamento, ou demonstração). */
  ia?: ScanIaSummary | null;
  /** `null` = repositório sem alvo de DAST; `undefined` = não sabemos. */
  targetUrl?: string | null;
}) {
  const state = tierState(job, 2);
  const running = state === 'running';
  const passos = tierToolRuns(job, 2, { targetUrl, runs });
  const { ran, total } = tierProgress(passos);
  const pct = total > 0 ? Math.round((ran / total) * 100) : 0;
  const skip = tierSkipReason(job, 2);

  /*
   * As CADEIAS são o assunto do card. `iaChains` cai na lista plana (`paths`)
   * quando o relatório é anterior ao `attack_chains`, montando uma cadeia sem
   * título — mostrar menos, não nada.
   */
  const chains = iaChains(ia);
  const degraded = !!ia?.degraded;
  /*
   * `ia` ausente é "não sabemos", NÃO "não há caminho": é o caso da demonstração
   * e de toda execução sem relatório de Tier 3. Dizer "nenhum caminho
   * encadeável" aqui afirmaria um resultado que ninguém calculou.
   */
  const semDados = !ia;

  const tag = running
    ? 'simulando'
    : state === 'queued'
      ? 'na fila'
      : state === 'skipped' || state === 'blocked'
        ? 'dispensada'
        : semDados
          ? 'sem dados'
          : degraded
            ? 'heurística'
            : chains.length > 0
              ? 'simulação por IA + Caldera'
              : 'sem caminho';

  return (
    <div className="rep-card apc rep-mb">
      <div className="apc-hd">
        <span className="apc-ico">
          <IconBolt />
        </span>
        <span className="apc-nm">Caminhos de ataque · {TIER_META[2].name}</span>
        <span className="apc-tag" data-s={running || state === 'done' ? undefined : 'idle'}>
          {running && <IconSpin size={8} color="var(--ia-strong)" />}
          {tag}
        </span>
        {/* Em execução, o que importa é onde a análise está; com as cadeias
            prontas, a legenda dos desfechos. */}
        {running ? (
          <span className="apc-ct">
            {ran} de {total} ferramentas
          </span>
        ) : (
          <Legend chains={chains} />
        )}
      </div>

      <p className="apc-tx">
        {running ? (
          <>
            A I.A encadeia o que os scanners acharam com a inteligência de ameaça e a
            emulação de adversário para projetar por onde um ataque real passaria.
          </>
        ) : state === 'skipped' || state === 'blocked' ? (
          skip ? (
            SKIP_REASON_LONG[skip]
          ) : (
            'Esta etapa não rodou nesta execução.'
          )
        ) : state === 'queued' ? (
          <>
            A análise profunda ainda não começou. Ela roda depois do Tier 2, quando o
            Gate 2 escala — o SLA da etapa é {TIER_META[2].sla}.
          </>
        ) : semDados ? (
          <>
            O resumo da camada I.A não está disponível para esta execução — ou o
            relatório de Tier 3 não foi gerado, ou estes são dados de demonstração.
            <b> Isso não quer dizer que não há caminho de ataque</b>: quer dizer que
            ninguém calculou.
          </>
        ) : degraded ? (
          <>
            O Claude não respondeu nesta execução
            {ia?.reason ? <> (<b>{ia.reason}</b>)</> : null}, então o Tier 3 fechou com a
            heurística de fallback. <b>Não há attack path encadeado</b> para este commit —
            os achados das ferramentas continuam válidos.
          </>
        ) : chains.length === 0 ? (
          <>
            A I.A analisou os achados e <b>não encontrou caminho de ataque encadeável</b>{' '}
            entre eles. Os findings seguem listados individualmente.
          </>
        ) : (
          <>
            A IA projetou as cadeias a partir das CVEs do catálogo KEV e da superfície
            exposta; o Caldera executou os movimentos reais.{' '}
            {ia?.kill_chain_complete ? (
              <>
                A cadeia está <b>completa</b> — há rota do acesso inicial até o impacto.
              </>
            ) : (
              <>A cadeia não fecha ponta a ponta nesta execução.</>
            )}
          </>
        )}
      </p>

      {/*
       * Em execução o card mostra ONDE a análise está: a barra e as quatro
       * ferramentas do tier, com o estado real de cada uma. Não é um roteiro
       * inventado — o pipeline não expõe sub-etapas dentro da chamada ao Claude.
       *
       * Com as cadeias prontas, o checklist sai: ele já vive na banda expansível
       * do card de findings, e aqui o assunto passa a ser o caminho em si.
       */}
      {running ? (
        <>
          <div
            className="apc-prog"
            role="progressbar"
            aria-valuenow={ran}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="Ferramentas concluídas no Tier 3"
          >
            <span style={{ width: `${pct}%` }} />
          </div>

          {passos.map((run, i) => (
            <Step
              key={run.tool.id}
              run={run}
              ia={ia ?? null}
              last={i === passos.length - 1}
            />
          ))}

          <div className="apc-note">
            <span className="apc-note-dot" />
            <span>
              <b>Ainda em cálculo:</b> os caminhos aparecem aqui quando a etapa
              terminar. O SLA é {TIER_META[2].sla}.
            </span>
          </div>
        </>
      ) : (
        chains.map((chain, i) => <Chain key={i} chain={chain} index={i} />)
      )}
    </div>
  );
}
