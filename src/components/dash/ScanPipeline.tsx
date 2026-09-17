import { TIER_META } from '@/lib/dash/format';
import {
  SKIP_REASON_LONG,
  TIER_TOOLS,
  chainEmulated,
  chainEmulatedPhrase,
  chainTitle,
  fmtToolDuration,
  phasePt,
  iaChainStats,
  iaChains,
  iaPathCount,
  pipelineProgress,
  tierProgress,
  tierSkipReason,
  tierState,
  tierToolRuns,
  toolDetail,
  type IaChain,
  type ScanIaSummary,
  type ToolRun,
  type ToolRunDto,
  type ToolState,
} from '@/lib/dash/pipeline-tools';
import type { ScanJob } from '@/lib/dash/types';

/**
 * O pipeline de uma execução: trilho vertical + um painel por tier.
 *
 * O Tier 3 não é "mais um passo" — é o diferencial do produto (correlacionar
 * achados com adversary emulation e I.A). Por isso ele tem superfície própria,
 * a cor da camada I.A e o resultado do attack path em destaque ao lado das
 * ferramentas, enquanto os Tiers 1 e 2 são painéis discretos.
 *
 * TODO texto de detalhe sai de dado real (`scan_tool_runs` + o `analysis_json`
 * compactado em `ia`). Onde o pipeline não persiste nada, a tela mostra menos —
 * não prosa inventada. Ver o cabeçalho de `pipeline-tools.ts`.
 */

/* ═══════════════════════ ícones ═══════════════════════ */

export function IconCheck({ size = 11, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M4 12.5l5 5L20 7" />
    </svg>
  );
}

/** Anel girando. `bare` desenha só o arco, sem o trilho de fundo. */
export function IconSpin({ size = 16, color = 'var(--ia)' }: { size?: number; color?: string }) {
  return (
    <svg className="spin-15" viewBox="0 0 20 20" fill="none" width={size} height={size}>
      <circle cx="10" cy="10" r="8.4" stroke="var(--gauge-track)" strokeWidth="2.2" />
      <path d="M10 1.6a8.4 8.4 0 015.94 2.46" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconX({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" width={size} height={size}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="var(--ia-on)" width="12" height="12">
      <path d="M13 2L4.5 13.5H10l-1 8.5 8.5-11.5H12l1-8.5z" />
    </svg>
  );
}

/** Ícone da linha de uma ferramenta, um por estado. */
function ToolIcon({ state }: { state: ToolState }) {
  if (state === 'done') {
    return (
      <span className="grid place-items-center rounded-full" style={{ width: 15, height: 15, background: '#22c55e' }}>
        <IconCheck size={9} color="#fff" />
      </span>
    );
  }
  if (state === 'running') return <IconSpin size={15} />;
  if (state === 'failed') {
    return (
      <span className="grid place-items-center rounded-full text-white" style={{ width: 15, height: 15, background: '#ef4444' }}>
        <IconX size={8} />
      </span>
    );
  }
  if (state === 'degraded') {
    return (
      <span className="grid place-items-center rounded-full" style={{ width: 15, height: 15, background: 'rgba(234,179,8,.18)', border: '1px solid #eab308', color: '#eab308' }}>
        <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1 }}>!</span>
      </span>
    );
  }
  if (state === 'queued') {
    return (
      <svg viewBox="0 0 20 20" fill="none" width="15" height="15">
        <circle cx="10" cy="10" r="8" stroke="var(--border-strong)" strokeWidth="1.8" strokeDasharray="3 3" />
      </svg>
    );
  }
  // Pulada/interrompida: traço. Ler como "decidiu-se não rodar", não "pendente".
  return <span className="trow-dash">—</span>;
}

/* ═══════════════════════ linha de ferramenta ═══════════════════════ */

/**
 * Uma ferramenta: icone + nome + detalhe.
 *
 * Exportada porque o card de findings do relatorio abre as MESMAS linhas ao
 * expandir a banda de uma etapa. Duas implementacoes da mesma linha seriam
 * dois desenhos para o mesmo dado, nas duas telas do mesmo fluxo.
 */
export function ToolRowLine({ run, ia }: { run: ToolRun; ia?: ScanIaSummary | null }) {
  const detail = toolDetail(run, ia);
  const skipped = run.state === 'skipped' || run.state === 'blocked';

  return (
    <div className="trow" data-s={run.state}>
      <span className="trow-ico">
        <ToolIcon state={run.state} />
      </span>
      <span className="trow-body">
        <span className="trow-nm">{run.tool.name}</span>
        {skipped && <span className="tpill-tag">não rodou</span>}
        {detail && <span className="trow-dt">{detail}</span>}
      </span>
    </div>
  );
}

/* ═══════════════════════ card da camada I.A ═══════════════════════ */

/**
 * O que a I.A do Tier 3 produziu — ou, enquanto roda, onde ela está.
 *
 * O checklist do estado "em execução" NÃO é um roteiro de progresso: cada passo
 * é uma ferramenta real do Tier 3, com o estado real dela em `scan_tool_runs`.
 * O pipeline não expõe sub-etapas dentro da chamada ao Claude, então inventar
 * uma barra de progresso interna seria encenação.
 */
function IaCard({
  runs,
  ia,
  running,
}: {
  runs: ToolRun[];
  ia?: ScanIaSummary | null;
  running: boolean;
}) {
  /*
   * CADEIAS, não passos.
   *
   * Este card desenhava `ia.paths` — a lista PLANA de passos — enquanto a
   * etiqueta contava cadeias: dizia "2 caminhos" no cabeçalho e desenhava 11
   * itens numerados logo abaixo, e quem lê conta os itens. O relatório sempre
   * agrupou por `attack_chains`, então as duas telas mostravam a mesma execução
   * em unidades diferentes.
   *
   * `caminhos` é `chains.length` por construção (`iaPathCount` deriva de
   * `iaChains`), então o número da etiqueta é exatamente quantas linhas isto
   * renderiza. Se um dia divergirem, é bug.
   */
  const chains = iaChains(ia);
  const caminhos = iaPathCount(ia);
  const degraded = !!ia?.degraded;
  // `ia` ausente é "não sabemos", NÃO "não há caminho": é o caso da demonstração
  // e de execuções sem relatório de Tier 3. Dizer "nenhum caminho encadeável"
  // aqui seria afirmar um resultado que ninguém calculou.
  const semDados = !ia;

  const titulo = running ? 'I.A · simulação de attack path' : 'I.A · attack path';
  const tag = running
    ? 'simulando'
    : semDados
      ? 'sem dados'
      : degraded
        ? 'heurística'
        : caminhos > 0
          ? `${caminhos} caminho${caminhos === 1 ? '' : 's'}`
          : 'sem caminho';

  return (
    <div className="ia-card">
      <div className="ia-card-hd">
        <span className="ia-card-ico">
          <IconBolt />
        </span>
        <span className="ia-card-nm">{titulo}</span>
        <span className="ia-card-tag">
          {running && <IconSpin size={10} />}
          {tag}
        </span>
      </div>

      {running ? (
        <>
          <p className="ia-prose">
            A I.A encadeia o que os scanners acharam com a inteligência de ameaça e a
            emulação de adversário para projetar por onde um ataque real passaria.
          </p>
          {/* Os passos SÃO as ferramentas do tier, com o estado real de cada uma. */}
          <div className="ia-steps">
            {runs.map((run) => (
              <div key={run.tool.id} className="ia-step" data-s={run.state}>
                <span className="ia-step-ico">
                  <ToolIcon state={run.state} />
                </span>
                <span>{run.tool.role}</span>
                {run.state === 'running' && <span className="ia-step-hint">em andamento</span>}
                {run.state === 'skipped' && <span className="ia-step-hint">não rodou</span>}
              </div>
            ))}
          </div>
        </>
      ) : semDados ? (
        <p className="ia-prose">
          O resumo da camada I.A não está disponível para esta execução — ou o
          relatório de Tier 3 não foi gerado, ou estes são dados de demonstração.
          <b> Isso não quer dizer que não há caminho de ataque</b>: quer dizer que
          ninguém calculou.
        </p>
      ) : degraded ? (
        <p className="ia-prose">
          O Claude não respondeu nesta execução
          {ia?.reason ? (
            <>
              {' '}(<b>{ia.reason}</b>)
            </>
          ) : null}
          , então o Tier 3 fechou com a heurística de fallback. <b>Não há attack path
          encadeado</b> para este commit — os achados das ferramentas continuam válidos.
        </p>
      ) : chains.length === 0 ? (
        /* Sobre o que É desenhado: um relatório que traga só `attack_chains`
           (sem a lista plana) tem caminho, e afirmar que não há seria negar o
           que a outra tela mostra. */
        <p className="ia-prose">
          A I.A analisou os achados e <b>não encontrou caminho de ataque encadeável</b> entre
          eles. Os findings seguem listados individualmente no relatório.
        </p>
      ) : (
        <>
          <IaProse ia={ia!} />
          <div className="ia-paths">
            {/* `key` pelo índice: cadeia não tem id, igual ao relatório. */}
            {chains.map((chain, i) => (
              <IaChainRow key={i} chain={chain} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Uma CADEIA por linha: número, título e o que ela atravessa.
 *
 * É a forma compacta do bloco que o relatório abre passo a passo. A numeração e
 * o título são os mesmos (`chainTitle`), para quem clicou numa linha aqui
 * reconhecê-la lá.
 *
 * O `finding_count` por passo, que a lista plana trazia, **não tem equivalente
 * em `attack_chains`** e sai de propósito: recuperá-lo exigiria voltar a
 * desenhar a outra representação, que é a origem do bug que isto conserta.
 */
function IaChainRow({ chain, index }: { chain: IaChain; index: number }) {
  const steps = chain.steps ?? [];
  // A sequência de fases é a kill chain em forma curta — o dado mais informativo
  // que cabe numa linha. `phase` é anulável, e `phasePt` espera `string`.
  const fases = steps
    .map((step) => step.phase)
    .filter((fase): fase is string => !!fase)
    .map(phasePt);
  const { ok } = chainEmulated(chain);

  return (
    <div className="ia-path" data-sev={chain.severity ?? undefined}>
      <span className="ia-path-n">{index + 1}</span>
      <span className="ia-path-b">
        <span className="ia-path-tx">{chainTitle(chain, index)}</span>
        <span className="ia-path-mt">
          <span>
            {steps.length} passo{steps.length === 1 ? '' : 's'}
          </span>
          {fases.length > 0 && (
            <>
              <span>·</span>
              <span>{fases.join(' → ')}</span>
            </>
          )}
          {ok > 0 && (
            <>
              <span>·</span>
              <span className="ia-path-val">{chainEmulatedPhrase(chain)}</span>
            </>
          )}
        </span>
      </span>
    </div>
  );
}

/** Frase de abertura montada com os números reais do `analysis_json`. */
function IaProse({ ia }: { ia: ScanIaSummary }) {
  /*
   * TODOS os números da mesma base.
   *
   * `caminhos`/`passos` saíam das cadeias e `fases`/`validados` da lista plana,
   * na mesma frase — com `chains` presente e `paths` vazio isso dava "2 caminhos
   * em 12 passos, atravessando 0 fases", e o `validados === passos` comparava
   * bases diferentes.
   */
  const { caminhos: n, passos, fases, emulados, outcomes } = iaChainStats(ia);
  // `bloqueado` é uma defesa que funcionou: não pode ser somado a "não emulado".
  const nenhumaEmulacao =
    emulados === 0 && outcomes.nao_emulado + outcomes.projecao === passos;

  return (
    <p className="ia-prose">
      A I.A encadeou{' '}
      <b>
        {n} caminho{n === 1 ? '' : 's'} de ataque
      </b>{' '}
      em {passos} passo{passos === 1 ? '' : 's'}, atravessando {fases} fase
      {fases === 1 ? '' : 's'} do MITRE ATT&amp;CK
      {emulados > 0 ? (
        <>
          , {emulados} <b>emulado{emulados === 1 ? '' : 's'} pelo Caldera</b>
        </>
      ) : null}
      .{' '}
      {nenhumaEmulacao ? 'Nenhum passo foi emulado nesta execução. ' : ''}
      {ia.kill_chain_complete ? (
        <>
          A cadeia está <b>completa</b> — há rota do acesso inicial até o impacto.
        </>
      ) : (
        <>A cadeia não fecha ponta a ponta nesta execução.</>
      )}
    </p>
  );
}

/* ═══════════════════════ painéis de tier ═══════════════════════ */

function TierMeta({
  job,
  index,
  runs,
}: {
  job: ScanJob;
  index: number;
  runs: ToolRun[];
}) {
  const state = tierState(job, index);
  const { ran, total } = tierProgress(runs);
  const dur = [job.t1_dur, job.t2_dur, job.t3_dur][index];
  const meta = TIER_META[index];

  return (
    <span className="tier-id-meta">
      {state === 'running' ? (
        <>
          <IconSpin size={11} />
          <span className="on">em execução</span>
        </>
      ) : dur ? (
        <span>{dur}</span>
      ) : (
        <span>{meta.sla}</span>
      )}
      <span>·</span>
      <span>
        {ran}/{total} {ran === 1 ? 'rodou' : 'rodaram'}
      </span>
    </span>
  );
}

/* ═══════════════════════ trilho ═══════════════════════ */

const NODE_ICON: Partial<Record<ToolState, React.ReactNode>> = {
  done: <IconCheck size={12} color="currentColor" />,
  failed: <IconX size={10} />,
};

function RailNode({ state, ia }: { state: ToolState; ia?: boolean }) {
  if (state === 'running') {
    return (
      <span className={`pipe-node${ia ? ' is-ia' : ''}`} data-s="running">
        <IconSpin size={ia ? 26 : 20} />
      </span>
    );
  }
  return (
    <span className={`pipe-node${ia ? ' is-ia' : ''}`} data-s={state}>
      {NODE_ICON[state] ?? null}
    </span>
  );
}

function gateKind(job: ScanJob, gate: 1 | 2): 'passed' | 'held' | 'blocked' | 'idle' {
  const prev = gate === 1 ? job.tier1_status : job.tier2_status;
  const next = gate === 1 ? job.tier2_status : job.tier3_status;
  if (job.blocked_at_tier === gate) return 'blocked';
  if (prev === 'done' && next === 'skipped') return 'held';
  if (prev === 'done' && next) return 'passed';
  return 'idle';
}

/* ═══════════════════════ o pipeline ═══════════════════════ */

export function ScanPipeline({
  job,
  runs,
  ia,
  targetUrl,
}: {
  job: ScanJob;
  /** Linhas de `GET /scans/{id}/tools`. Ausente → cai para o status do tier. */
  runs?: ToolRunDto[];
  ia?: ScanIaSummary | null;
  /** `null` = repositório sem alvo de DAST; `undefined` = não sabemos. */
  targetUrl?: string | null;
}) {
  const byTier = TIER_TOOLS.map((_, index) =>
    tierToolRuns(job, index, { targetUrl, runs }),
  );
  const skips = TIER_TOOLS.map((_, index) => tierSkipReason(job, index));
  const t3State = tierState(job, 2);
  const t3Running = t3State === 'running';
  // Painel do Tier 3 só entra em modo "resultado" quando a etapa terminou; antes
  // disso o card mostra onde a análise está, não um vazio.
  const t3Reached = t3State !== 'queued' && t3State !== 'blocked' && t3State !== 'skipped';

  return (
    <div className="pipe">
      {[0, 1, 2].map((index) => {
        const isIa = index === 2;
        const state = tierState(job, index);
        const runsTier = byTier[index];
        const skip = skips[index];
        const explainSkip = !!skip && skips.indexOf(skip) === index;
        const meta = TIER_META[index];

        return (
          <PipeRow key={meta.name} index={index}>
            <RailNode state={state} ia={isIa} />

            {isIa ? (
              <div className="tier-panel is-ia">
                <div className="ia-hd">
                  <span className="ia-hd-nm">
                    {meta.name} · {meta.desc}
                  </span>
                  <TierMeta job={job} index={index} runs={runsTier} />
                  <span className={`ia-badge${t3Reached ? '' : ' is-idle'}`}>
                    {t3Running && <IconSpin size={10} color="var(--ia-on)" />}
                    {t3Running
                      ? 'camada IA em execução'
                      : t3State === 'done'
                        ? 'camada IA · concluída'
                        : t3State === 'skipped'
                          ? 'camada IA · dispensada'
                          : t3State === 'failed'
                            ? 'camada IA · falhou'
                            : 'camada IA · aguardando'}
                  </span>
                </div>

                {t3Reached ? (
                  <div className="ia-split">
                    <div>
                      <div className="ia-tools-lbl">Ferramentas da fase</div>
                      <div className="tier-rows">
                        {runsTier
                          .filter((r) => r.tool.id !== 'ia-tier3')
                          .map((run) => (
                            <ToolRowLine key={run.tool.id} run={run} ia={ia} />
                          ))}
                      </div>
                    </div>
                    <IaCard
                      runs={runsTier.filter((r) => r.tool.id !== 'ia-tier3')}
                      ia={ia}
                      running={t3Running}
                    />
                  </div>
                ) : (
                  <>
                    <div className="tier-rows">
                      {runsTier.map((run) => (
                        <ToolRowLine key={run.tool.id} run={run} ia={ia} />
                      ))}
                    </div>
                    {explainSkip && skip && (
                      <p className="tools-skip">{SKIP_REASON_LONG[skip]}</p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="tier-panel">
                <div>
                  <div className="tier-id-nm">
                    {meta.name} · {meta.desc}
                  </div>
                  <TierMeta job={job} index={index} runs={runsTier} />
                </div>
                <div className="tier-rows">
                  {runsTier.map((run) => (
                    <ToolRowLine key={run.tool.id} run={run} ia={ia} />
                  ))}
                  {explainSkip && skip && (
                    <p className="tools-skip">{SKIP_REASON_LONG[skip]}</p>
                  )}
                </div>
              </div>
            )}
          </PipeRow>
        );
      })}

      {/* Gates entre os tiers, no próprio trilho. */}
      <PipeGateRow job={job} gate={1} />
      <PipeGateRow job={job} gate={2} />
    </div>
  );
}

/**
 * Uma linha da grade: célula do trilho + célula do painel.
 *
 * `grid-row` explícito porque os gates são linhas próprias e precisam cair
 * ENTRE dois painéis — a ordem no JSX não daria isso sozinha.
 */
function PipeRow({ index, children }: { index: number; children: React.ReactNode }) {
  const [node, panel] = children as [React.ReactNode, React.ReactNode];
  const row = index * 2 + 1;
  const ultima = index === 2;

  return (
    <>
      <div
        className="pipe-rail"
        data-on={index === 0 ? 'false' : 'true'}
        data-pos={index === 0 ? 'first' : ultima ? 'last' : 'mid'}
        style={{ gridRow: row, gridColumn: 1 }}
      >
        {node}
      </div>
      <div style={{ gridRow: row, gridColumn: 2, minWidth: 0 }}>{panel}</div>
    </>
  );
}

function PipeGateRow({ job, gate }: { job: ScanJob; gate: 1 | 2 }) {
  const kind = gateKind(job, gate);
  const tip =
    kind === 'blocked'
      ? `Gate ${gate} bloqueou o pipeline`
      : kind === 'held'
        ? `Gate ${gate} não escalou`
        : kind === 'passed'
          ? `Gate ${gate} liberou a etapa seguinte`
          : `Gate ${gate} ainda não decidiu`;

  return (
    <div
      className="pipe-rail"
      data-on={kind === 'passed' || kind === 'blocked' ? 'true' : 'false'}
      data-pos="gate"
      style={{ gridRow: gate * 2, gridColumn: 1 }}
      title={tip}
    >
      <span className="pipe-gate" data-g={kind} />
    </div>
  );
}

/** Rodapé agregado: quantas ferramentas rodaram e o que a I.A achou. */
export function ScanPipelineFooter({
  job,
  runs,
  ia,
  targetUrl,
}: {
  job: ScanJob;
  runs?: ToolRunDto[];
  ia?: ScanIaSummary | null;
  targetUrl?: string | null;
}) {
  const byTier = TIER_TOOLS.map((_, index) =>
    tierToolRuns(job, index, { targetUrl, runs }),
  );
  const { ran, total } = pipelineProgress(byTier);
  const caminhos = iaPathCount(ia);
  const totalMs = byTier
    .flat()
    .reduce((acc, run) => acc + (run.durationMs ?? 0), 0);

  // Sem linhas reais o estado de cada ferramenta é DEDUZIDO do status da etapa,
  // e "10 de 10 rodaram" seria uma dedução apresentada como contagem. Nesse
  // caso o rodapé diz de onde vem o que está na tela, em vez de somar.
  const real = !!runs && runs.length > 0;

  const partes = real
    ? [
        `${ran} de ${total} ferramentas rodaram`,
        totalMs > 0 ? `${fmtToolDuration(totalMs)} somados` : null,
        ia && !ia.degraded
          ? `${caminhos} caminho${caminhos === 1 ? '' : 's'} de ataque`
          : null,
      ]
    : ['Status por etapa — esta execução não tem registro por ferramenta'];

  return <span className="exec-ft-tx">{partes.filter(Boolean).join(' · ')}</span>;
}

/* ═══════════════════════ card minimizado ═══════════════════════ */

const MINI_STATUS: Record<string, string> = {
  running: 'Rodando',
  done: 'Concluído',
  failed: 'Falhou',
  blocked: 'Bloqueado',
};

/**
 * A execução em uma linha, para o card minimizado.
 *
 * O texto do meio responde "o que está acontecendo agora" a partir do estado
 * real: qual ferramenta está em execução, ou o desfecho. Nada de prosa fixa —
 * um card minimizado que diz sempre a mesma coisa não vale a linha que ocupa.
 */
export function ScanMiniRow({
  job,
  status,
  runs,
  ia,
  targetUrl,
}: {
  job: ScanJob;
  status: 'running' | 'done' | 'failed' | 'blocked';
  runs?: ToolRunDto[];
  ia?: ScanIaSummary | null;
  targetUrl?: string | null;
}) {
  const byTier = TIER_TOOLS.map((_, index) =>
    tierToolRuns(job, index, { targetUrl, runs }),
  );
  // Sem linha real, o estado de CADA ferramenta é o do tier inteiro: dizer
  // "Trivy, Semgrep e Prowler em execução" ou "10 de 10 rodaram" seria a
  // dedução vendida como fato. Mesma guarda do rodapé.
  const real = !!runs && runs.length > 0;
  const rodando = real ? byTier.flat().filter((r) => r.state === 'running') : [];

  let resumo: string;
  if (rodando.length > 0) {
    // Quem está rodando AGORA. É a informação que justifica a linha.
    const nomes = rodando.map((r) => r.tool.name).join(', ');
    resumo =
      rodando.length === 1 && rodando[0].tool.id === 'ia-tier3'
        ? 'Simulação de attack path por I.A em andamento'
        : `${nomes} em execução`;
  } else if (status === 'blocked') {
    resumo = 'Gate 1 interrompeu o pipeline — secret verificado no commit';
  } else if (status === 'running') {
    // Sem detalhe por ferramenta, o que se sabe é qual ETAPA está aberta.
    const aberto = [0, 1, 2].find((i) => tierState(job, i) === 'running');
    resumo =
      aberto === undefined
        ? 'Pipeline em andamento'
        : `${TIER_META[aberto].name} · ${TIER_META[aberto].desc} em execução`;
  } else if (ia && !ia.degraded && iaPathCount(ia) > 0) {
    const caminhos = iaPathCount(ia);
    resumo = `${caminhos} caminho${caminhos === 1 ? '' : 's'} de ataque encadeado${caminhos === 1 ? '' : 's'}`;
  } else if (real) {
    const { ran, total } = pipelineProgress(byTier);
    resumo = `${ran} de ${total} ferramentas rodaram`;
  } else {
    const alcancou = [2, 1, 0].find(
      (i) => tierState(job, i) === 'done' || tierState(job, i) === 'failed',
    );
    resumo =
      alcancou === undefined
        ? 'Sem etapa concluída'
        : `Pipeline foi até o ${TIER_META[alcancou].name}`;
  }

  return (
    <div className="scan-mini">
      <span className="scan-mini-st" data-run={status}>
        {status === 'running' ? <IconSpin size={14} /> : null}
        {MINI_STATUS[status] ?? status}
      </span>
      <span className="scan-mini-tx">{resumo}</span>

      <span className="scan-mini-right">
        <span className="scan-mini-tiers">
          {[0, 1, 2].map((index) => {
            const st = tierState(job, index);
            return (
              <span key={index} className="scan-mini-tier" data-s={st}>
                {index > 0 && <span className="scan-mini-dot">·</span>}
                T{index + 1}
                <TierGlyph state={st} />
              </span>
            );
          })}
        </span>
      </span>
    </div>
  );
}

/** Glifo mínimo do tier na linha compacta. */
function TierGlyph({ state }: { state: ToolState }) {
  if (state === 'running') return <IconSpin size={11} />;
  if (state === 'done') return <IconCheck size={10} />;
  if (state === 'failed') return <IconX size={9} />;
  // Pulado e na fila usam o traço: nenhum dos dois rodou.
  return <span aria-hidden="true">—</span>;
}
