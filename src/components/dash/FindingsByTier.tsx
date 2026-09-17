'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { findingsByTitleRoute } from '@/lib/dash/dash-routes';
import { TIER_META, fmtInt, severityCounts } from '@/lib/dash/format';
import {
  SKIP_REASON_LONG,
  TIER_TOOLS,
  tierSkipReason,
  tierState,
  tierToolRuns,
  type ScanIaSummary,
  type ToolRunDto,
} from '@/lib/dash/pipeline-tools';
import type { FindingGroup, ScanJob, Severity } from '@/lib/dash/types';
import {
  IconCheck,
  IconSpin,
  ScanPipelineFooter,
  ToolRowLine,
} from './ScanPipeline';

/**
 * Os findings de um commit, agrupados por tipo e organizados por etapa.
 *
 * **Uma linha é um problema, não uma ocorrência.** Com DAST ligado, um único
 * alerta do ZAP ("Cross-Domain Misconfiguration") aparece uma vez por rota e um
 * scan vira milhares de linhas que são umas dezenas de problemas. A agregação vem
 * de `GET /findings/groups?commit_sha=…`, que não tem teto — a resposta inteira
 * cabe numa tela. As ocorrências de um grupo ficam a um clique, recortadas no
 * servidor (`?titulo=` em igualdade exata).
 *
 * A divisão por etapa é o que faz esta tela contar a mesma história do pipeline:
 * o Tier 1 achou X, o Tier 2 achou Y, e o Tier 3 **ainda está calculando** — que
 * é diferente de não ter achado nada. Uma etapa em execução mostra a frase de
 * espera, nunca uma lista vazia.
 *
 * É também onde vive o estado por etapa nesta tela: banda com o desfecho, as
 * ferramentas do catálogo e a contagem ("3 findings · 1 pulada"). A ferramenta
 * que não rodou é parte do resultado, não um detalhe a esconder.
 */

/** Quantos problemas por etapa antes de mandar para a tela de Findings. */
const MAX_GRUPOS_POR_TIER = 8;

function IconChevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className="fb-band-chev"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="flex-shrink-0 text-fg-dim"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** A linha de um problema: severidade, título, quantas vezes, onde, ferramenta. */
function GroupRow({ group }: { group: FindingGroup }) {
  const router = useRouter();
  const varios = group.ocorrencias > 1;

  return (
    <button
      type="button"
      className="fb-row"
      data-sev={group.severity}
      /* O drill-down vai pelo SERVIDOR: `titulo` viaja como `?title=` e a API
         devolve só as ocorrências deste problema. Levar 3 mil ocorrências para
         o cliente filtrar seria bater no teto e mostrar um recorte arbitrário. */
      onClick={() => router.push(findingsByTitleRoute(group.title))}
      title={`Ver ${varios ? `as ${fmtInt(group.ocorrencias)} ocorrências` : 'a ocorrência'} de "${group.title}"`}
    >
      <SevTag severity={group.severity} fixa />
      <span className="fb-row-tl truncate">
        {group.title}
        {varios ? (
          <span className="fb-row-oc"> · {fmtInt(group.ocorrencias)} ocorrências</span>
        ) : null}
      </span>
      {/* `caminhos` só acrescenta quando difere das ocorrências: 3.007
          ocorrências em 1 caminho e em 3.007 caminhos são problemas distintos. */}
      {group.caminhos > 1 ? (
        <span className="fb-row-mt">{fmtInt(group.caminhos)} arquivos</span>
      ) : group.cve_id ? (
        <span className="fb-row-mt">{group.cve_id}</span>
      ) : group.amostra[0] ? (
        <span className="fb-row-mt" title={group.amostra[0]}>
          {group.amostra[0]}
        </span>
      ) : (
        <span className="fb-row-mt">{group.cwe_id ?? ''}</span>
      )}
      <span className="fb-row-src">{group.source.toUpperCase()}</span>
      <IconArrow />
    </button>
  );
}

/**
 * Tag de severidade — a MESMA nas duas posições do card.
 *
 * No cabeçalho ela leva a contagem ("9 MEDIUM"), na linha só o nome ("MEDIUM"),
 * e o desenho é idêntico: fundo translúcido, borda na mesma cor e texto
 * colorido e centralizado, com os alfas da barra de filtros da tela de Findings
 * (0.12 no fundo, 0.4 na borda). A cor sai dos tokens
 * `--sev-*` no CSS, que acompanham o tema — `SEV_COLORS`/`sevColor` são fixas
 * de propósito (gráficos e gauges) e no tema claro deixavam texto claro sobre
 * fundo claro.
 *
 * O badge sólido do dash (`SevBadge`, `.sev-fx`) foi tentado nas linhas e não
 * serve aqui: o token `--sev-*` é saturado e o texto por cima é escuro, então no
 * tema claro a linha ganhava uma pílula mostarda/oliva em que a cor da
 * severidade morria no próprio fundo em vez de marcar a linha. Ele continua nas
 * tabelas, onde é a coluna inteira e tem o contraste do fundo do card.
 *
 * `fixa` liga a largura mínima: nas linhas é o que alinha os títulos.
 */
function SevTag({
  severity,
  count,
  fixa = false,
}: {
  severity: Severity;
  count?: number;
  fixa?: boolean;
}) {
  return (
    <span className={`sevtag${fixa ? ' sevtag-w' : ''}`} data-sev={severity}>
      {count !== undefined ? `${fmtInt(count)} ${severity}` : severity}
    </span>
  );
}

export function FindingsByTier({
  job,
  groups,
  /** `GET /scans/{id}/tools`: o desfecho real por ferramenta de cada etapa. */
  toolRuns,
  ia,
  /** `null` = repositório sem alvo de DAST; `undefined` = não sabemos. */
  targetUrl,
  /** `false` = não foi possível agrupar (a API não respondeu). */
  ok,
}: {
  job: ScanJob;
  groups: FindingGroup[];
  toolRuns?: ToolRunDto[];
  ia?: ScanIaSummary | null;
  targetUrl?: string | null;
  ok: boolean;
}) {
  /*
   * Quais etapas estão com as ferramentas à vista.
   *
   * `useState`, nunca `localStorage`: o carrossel do cadastro renderiza esta
   * tela dentro de um iframe com `?preview=1` e não pode poluir estado real.
   */
  const [abertas, setAbertas] = useState<ReadonlySet<number>>(new Set());
  const alternar = (tier: number) =>
    setAbertas((prev) => {
      const proxima = new Set(prev);
      if (!proxima.delete(tier)) proxima.add(tier);
      return proxima;
    });

  const total = groups.reduce((soma, g) => soma + g.ocorrencias, 0);
  const severidades = severityCounts(
    groups.reduce<Record<string, number>>((acc, g) => {
      acc[g.severity] = (acc[g.severity] ?? 0) + g.ocorrencias;
      return acc;
    }, {}),
  );

  return (
    <div className="rep-card fb">
      <div className="fb-hd">
        <span className="fb-hd-nm">Findings deste commit</span>
        {ok ? (
          <span className="fb-hd-ct">
            · {groups.length} {groups.length === 1 ? 'problema' : 'problemas'} em{' '}
            {fmtInt(total)} {total === 1 ? 'ocorrência' : 'ocorrências'}
          </span>
        ) : null}
        {severidades.length > 0 ? (
          <span className="fb-sevs">
            {severidades.map(({ severity, count }) => (
              <SevTag key={severity} severity={severity} count={count} />
            ))}
          </span>
        ) : null}
      </div>

      {!ok ? (
        <p className="text-[13px] text-fg-dim">
          Não foi possível carregar os findings deste commit. A tela não afirma que não
          há nenhum — ela não conseguiu perguntar.
        </p>
      ) : (
        TIER_META.map((meta, index) => {
          const doTier = groups.filter((g) => g.tier === index + 1);
          const visiveis = doTier.slice(0, MAX_GRUPOS_POR_TIER);
          const ocorrencias = doTier.reduce((soma, g) => soma + g.ocorrencias, 0);

          const state = tierState(job, index);
          const runs = tierToolRuns(job, index, { runs: toolRuns });
          const pulados = runs.filter(
            (r) => r.state === 'skipped' || r.state === 'blocked',
          ).length;

          // Etapa sem desfecho e sem nada produzido: a espera é a informação.
          // Uma lista vazia diria "não achou", que é outra coisa.
          const esperando =
            visiveis.length === 0 && (state === 'running' || state === 'queued');
          const corIa = index === 2 ? 'var(--ia-strong)' : 'var(--run-strong)';

          const aberta = abertas.has(index + 1);
          const skip = tierSkipReason(job, index);

          return (
            <div key={meta.name} className="fb-tier">
              <button
                type="button"
                className="fb-band"
                data-t={index + 1}
                aria-expanded={aberta}
                onClick={() => alternar(index + 1)}
                title={
                  aberta
                    ? `Ocultar as ferramentas do ${meta.name}`
                    : `Ver as ferramentas do ${meta.name}, uma por uma`
                }
              >
                {/* Só quando há glifo: um `<span>` vazio deixaria 17px + o gap
                    de buraco antes do nome nas etapas na fila. */}
                {state === 'running' ? (
                  <span className="fb-band-ico">
                    <IconSpin size={17} color={corIa} />
                  </span>
                ) : state === 'done' ? (
                  <span className="fb-band-ico" style={{ background: '#22c55e' }}>
                    <IconCheck size={9} color="#fff" />
                  </span>
                ) : null}
                <span className="fb-band-nm">
                  {meta.name} · {meta.desc}
                </span>
                <span className="fb-band-tools truncate">
                  {TIER_TOOLS[index].map((tool) => tool.name).join(' · ')}
                </span>
                <span className="fb-band-ct">
                  {state === 'running'
                    ? 'em execução'
                    : state === 'queued'
                      ? 'na fila'
                      : state === 'skipped' || state === 'failed'
                        ? state === 'failed'
                          ? 'falhou'
                          : 'não executado'
                        : ocorrencias === 0
                          ? 'nada encontrado'
                          : `${fmtInt(ocorrencias)} ${ocorrencias === 1 ? 'finding' : 'findings'}`}
                  {/* "3 findings · 1 pulada": a ferramenta que não rodou é parte
                      do resultado, não um detalhe a esconder. */}
                  {pulados > 0 && state !== 'skipped'
                    ? ` · ${pulados} ${pulados === 1 ? 'pulada' : 'puladas'}`
                    : ''}
                </span>
                <IconChevron />
              </button>

              <div className="fb-body">
                {/* Expandida: as ferramentas da etapa, uma por linha, com o
                    desfecho real de cada uma — as MESMAS linhas do trilho da
                    tela de Scans (`ToolRowLine`), não uma segunda versão. */}
                {aberta && (
                  <div className="fb-tools">
                    {runs.map((run) => (
                      <ToolRowLine key={run.tool.id} run={run} ia={ia} />
                    ))}
                    {skip && <p className="tools-skip">{SKIP_REASON_LONG[skip]}</p>}
                  </div>
                )}

                {esperando ? (
                  <div className="fb-wait" data-t={index + 1}>
                    {state === 'running' ? <IconSpin size={20} color={corIa} /> : null}
                    <span>
                      {index === 2
                        ? 'Os caminhos de ataque aparecem aqui quando a emulação terminar'
                        : 'Os achados desta etapa aparecem aqui quando ela concluir'}{' '}
                      · SLA {meta.sla}
                    </span>
                  </div>
                ) : visiveis.length === 0 ? (
                  <div className="fb-wait" data-t={index + 1}>
                    <span>
                      {state === 'skipped'
                        ? 'Etapa não executada nesta execução.'
                        : 'Nenhum problema registrado nesta etapa.'}
                    </span>
                  </div>
                ) : (
                  <>
                    {visiveis.map((group) => (
                      <GroupRow
                        key={`${group.source}|${group.severity}|${group.title}|${group.cwe_id ?? ''}|${group.cve_id ?? ''}|${group.asset ?? ''}`}
                        group={group}
                      />
                    ))}
                    {doTier.length > visiveis.length ? (
                      <div className="fb-row-more">
                        + {doTier.length - visiveis.length} outros problemas nesta etapa —
                        veja a tela de Findings
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* O mesmo agregado do rodapé de cada execução na tela de Scans — "8 de 10
          ferramentas rodaram · 2m 4s somados · 3 caminhos de attack path". Era o
          número que fechava o card de lá e não tinha eco nenhum aqui. */}
      {ok && (
        <div className="exec-ft">
          <ScanPipelineFooter job={job} runs={toolRuns} ia={ia} targetUrl={targetUrl} />
        </div>
      )}
    </div>
  );
}
