'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AGING_LABELS,
  anyFilterActive,
  applyScope,
  defaultFrom,
  FF_DIMS,
  FF_GROUP_PAGE_SIZE,
  FF_PAGE_SIZE,
  pageNumbers,
  parseFilters,
  periodPreset,
  SCANNER_LIST,
  serializeFilters,
  SEV_STACK,
  sortFindings,
  type FilterDim,
  type FindingsFilters,
  type FindingsView,
  type SortColumn,
} from '@/lib/dash/findings-filters';
import {
  applyScopeToGroups,
  groupKey,
  sortGroups,
} from '@/lib/dash/findings-groups';
import { fmtAbs, fmtInt, hexA, sevColor, sourceLabel, timeAgo } from '@/lib/dash/format';
import { DAY } from '@/lib/dash/mock-data';
import type { Finding, FindingGroup } from '@/lib/dash/types';
import { EmptyState } from './EmptyState';
import { SevBadge } from './SevBadge';

function SortArrow({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return null;
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ marginLeft: 2, color: '#c22f3d' }}
    >
      {dir === 'asc' ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  );
}

/** Seta de expansão do grupo — girada por CSS para não trocar de nó. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-fg-mute transition-transform"
      style={{ transform: open ? 'rotate(90deg)' : 'none' }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

type FindingsScreenProps = {
  /**
   * Lista plana — só é buscada quando a visão é "Todos". Na visão agrupada o
   * servidor nem chega a pedir, porque seriam até 1000 findings para renderizar
   * ~14 linhas.
   */
  findings: Finding[];
  /** Findings agregados por tipo: a visão padrão. */
  groups: FindingGroup[];
  /** Soma das ocorrências de TODOS os grupos, antes de qualquer filtro. */
  groupsTotal: number;
  /** `true` = dataset do protótipo (sem API configurada, ou preview do cadastro). */
  demo: boolean;
  /** `false` = a API não respondeu; é diferente de "nenhum finding". */
  apiOk: boolean;
  /** `true` = o teto de busca foi atingido e a lista é um subconjunto. */
  truncated: boolean;
  /**
   * Âncora de tempo. Vem do servidor porque `Date.now()` no cliente divergiria
   * do HTML renderizado e quebraria a hidratação; em demonstração é `REF_NOW`,
   * o relógio congelado do protótipo.
   */
  now: number;
};

export function FindingsScreen({
  findings,
  groups,
  groupsTotal,
  demo,
  apiOk,
  truncated,
  now,
}: FindingsScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Deep link para um finding: `/dash/findings?finding=<id>`.
   *
   * Contrato usado pelo detalhe de execução e pela tela de Remediações, que
   * linkam para cá. Aqui a linha correspondente é rolada até a viewport e
   * destacada — o protótipo abria um slide-over, que ainda não foi portado.
   */
  const highlightId = searchParams.get('finding');

  const filters = useMemo(() => {
    const parsed = parseFilters(new URLSearchParams(searchParams.toString()), now);
    // `?finding=` aponta para uma LINHA, e linha só existe na lista plana —
    // então o deep link força a visão "Todos", inclusive nos pushes seguintes.
    return highlightId ? { ...parsed, vis: 'todos' as const } : parsed;
  }, [searchParams, now, highlightId]);

  const agrupado = filters.vis === 'grupos';

  /** Toda mutação de filtro vira uma troca de URL — a URL é a fonte da verdade. */
  const push = useCallback(
    (next: FindingsFilters) => {
      const qs = serializeFilters(next, now);
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [router, now],
  );

  /**
   * Ctrl/Cmd + clique acumula valores na dimensão; clique simples substitui
   * (e limpa se já era o único selecionado) — comportamento do protótipo.
   */
  const toggleDim = useCallback(
    (dim: FilterDim, value: string | number, additive: boolean) => {
      const current = filters[dim] as (string | number)[];
      const index = current.indexOf(value);
      let updated: (string | number)[];
      if (additive) {
        updated = index >= 0 ? current.filter((v) => v !== value) : [...current, value];
      } else {
        updated = index >= 0 && current.length === 1 ? [] : [value];
      }
      push({ ...filters, [dim]: updated, page: 1 } as FindingsFilters);
    },
    [filters, push],
  );

  const clearAll = useCallback(() => {
    push({
      ...filters,
      repositorios: [],
      categorias: [],
      severidades: [],
      scanners: [],
      tiers: [],
      faixaAging: [],
      status: null,
      busca: '',
      titulo: null,
      periodo: { de: defaultFrom(now), ate: null },
      page: 1,
    });
  }, [filters, push, now]);

  /**
   * Troca de visão. Voltar para "Agrupados" solta o drill-down: o título só
   * existe enquanto se olha as ocorrências de um grupo.
   */
  const setView = useCallback(
    (vis: FindingsView) => {
      push({
        ...filters,
        vis,
        titulo: vis === 'grupos' ? null : filters.titulo,
        page: 1,
      });
    },
    [filters, push],
  );

  /**
   * "Ver todas as N ocorrências": abre a visão plana escopada NO TÍTULO, que é
   * a mesma chave que a API aceita em `?title=`. Só o título — as outras
   * dimensões do grupo viriam junto no resultado de qualquer forma, e fixá-las
   * como filtro daria a impressão de que o usuário as escolheu.
   */
  const drillDown = useCallback(
    (group: FindingGroup) => {
      push({ ...filters, vis: 'todos', titulo: group.title, page: 1 });
    },
    [filters, push],
  );

  const setPeriod = useCallback(
    (preset: string) => {
      const periodo =
        preset === 'all'
          ? { de: null, ate: null }
          : { de: now - Number(preset) * DAY, ate: null };
      push({ ...filters, periodo, status: null, page: 1 });
    },
    [filters, push, now],
  );

  const setSort = useCallback(
    (col: SortColumn) => {
      const sort =
        filters.sort.col === col
          ? { col, dir: filters.sort.dir === 'asc' ? ('desc' as const) : ('asc' as const) }
          : { col, dir: col === 'sev' ? ('desc' as const) : ('asc' as const) };
      push({ ...filters, sort });
    },
    [filters, push],
  );

  // ── derivações ──
  const scoped = useMemo(
    () => applyScope(filters, findings, now),
    [filters, findings, now],
  );

  /**
   * O corte aberto/resolvido só existe em demonstração: a API não modela
   * resolução de finding (não há `status` nem `resolved_at`), então tudo que ela
   * devolve está aberto e filtrar por isso seria inventar dado.
   */
  const listBeforeSort = useMemo(
    () =>
      demo
        ? scoped.filter((x) =>
            filters.status === 'resolved'
              ? x.status === 'resolved'
              : x.status !== 'resolved',
          )
        : scoped,
    [scoped, filters.status, demo],
  );
  const list = useMemo(() => sortFindings(listBeforeSort, filters.sort), [
    listBeforeSort,
    filters.sort,
  ]);
  const remediados = demo ? scoped.filter((x) => x.status === 'resolved').length : 0;

  /** Total antes de qualquer filtro — governa o estado vazio "não há nada ainda". */
  const totalDisponivel = demo
    ? findings.filter((x) => x.status !== 'resolved').length
    : findings.length;

  // ── derivações da visão agrupada ──
  const groupScope = useMemo(
    () => applyScopeToGroups(filters, groups, now),
    [filters, groups, now],
  );
  const groupList = useMemo(
    () => sortGroups(groupScope, filters.sort),
    [groupScope, filters.sort],
  );
  /** Quantos findings os grupos visíveis representam. */
  const ocorrenciasVisiveis = groupScope.reduce((soma, g) => soma + g.ocorrencias, 0);

  const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(() => new Set());
  const toggleGrupo = useCallback((chave: string) => {
    setExpandidos((atual) => {
      const proximo = new Set(atual);
      if (!proximo.delete(chave)) proximo.add(chave);
      return proximo;
    });
  }, []);

  // ── paginação, comum às duas visões ──
  const pageSize = agrupado ? FF_GROUP_PAGE_SIZE : FF_PAGE_SIZE;
  const totalItens = agrupado ? groupList.length : list.length;
  const totalPages = Math.max(1, Math.ceil(totalItens / pageSize));
  const page = Math.min(Math.max(filters.page, 1), totalPages);
  const pageStart = (page - 1) * pageSize;
  const pageList = list.slice(pageStart, pageStart + pageSize);
  const pageGroups = groupList.slice(pageStart, pageStart + pageSize);

  const active = anyFilterActive(filters, now);
  const preset = periodPreset(filters, now);

  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightId) return;
    setFlash(highlightId);
    const row = document.getElementById(`finding-${highlightId}`);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const timer = window.setTimeout(() => setFlash(null), 1600);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  // ── barra de filtros ativos ──
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  const chipKeys: Record<FilterDim, string> = {
    repositorios: 'REPO',
    categorias: 'CATEGORIA',
    severidades: 'SEV',
    scanners: 'ORIGEM',
    tiers: 'TIER',
    faixaAging: 'AGING',
  };
  for (const dim of FF_DIMS) {
    for (const value of filters[dim] as (string | number)[]) {
      const label =
        dim === 'scanners'
          ? sourceLabel(String(value)).toUpperCase()
          : dim === 'tiers'
            ? `Tier ${value}`
            : dim === 'faixaAging'
              ? (AGING_LABELS[String(value)] ?? String(value))
              : String(value);
      activeChips.push({
        key: `${dim}-${value}`,
        label: `${chipKeys[dim]} ${label}`,
        onRemove: () => toggleDim(dim, value, true),
      });
    }
  }
  if (filters.busca) {
    activeChips.push({
      key: 'busca',
      label: `BUSCA ${filters.busca}`,
      onRemove: () => push({ ...filters, busca: '', page: 1 }),
    });
  }
  if (filters.titulo) {
    activeChips.push({
      key: 'titulo',
      label: `TIPO ${filters.titulo}`,
      onRemove: () => push({ ...filters, titulo: null, page: 1 }),
    });
  }
  if (preset !== '90') {
    const label =
      preset === 'all'
        ? 'Tudo'
        : preset === '7'
          ? '7 dias'
          : preset === '30'
            ? '30 dias'
            : 'Personalizado';
    activeChips.push({
      key: 'periodo',
      label: `PERÍODO ${label}`,
      onRemove: () => setPeriod('90'),
    });
  }

  /**
   * Estado vazio, compartilhado pelas duas visões — as três causas são as
   * mesmas: a API não respondeu, não há nada registrado ainda, ou os filtros
   * não deixaram nada passar.
   */
  const nadaRegistrado = agrupado ? groups.length === 0 : totalDisponivel === 0;
  const estadoVazio = !apiOk ? (
    <EmptyState
      title="Não foi possível carregar os findings"
      body="A API não respondeu ou a sessão expirou. Atualize a página em instantes — nada foi perdido, os findings continuam registrados."
    />
  ) : nadaRegistrado ? (
    demo ? (
      <EmptyState
        title="Nenhum finding, seu código está limpo neste commit."
        body="O último scan não encontrou vulnerabilidades. Novos findings aparecem aqui a cada scan."
      />
    ) : (
      <EmptyState
        title="Nenhum finding encontrado até agora."
        body="Os scans rodam a cada pull request nos repositórios monitorados. Assim que uma vulnerabilidade aparecer, ela é listada aqui."
      />
    )
  ) : (
    <EmptyState
      title="Sem dados para os filtros aplicados"
      body="Ajuste ou limpe os filtros para ver os findings desta execução."
      action={
        <button type="button" className="chip chip-clear" onClick={clearAll}>
          Limpar filtros
        </button>
      }
    />
  );

  const periodButton = (value: string, label: string) => (
    <button
      key={value}
      type="button"
      className={`perbtn${preset === value ? ' on' : ''}`}
      onClick={() => setPeriod(value)}
    >
      {label}
    </button>
  );

  return (
    <div className="page-wrap">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {/* Sem DemoDataBadge: esta tela lê a API real, e em demonstração o
                badge já se esconderia sozinho. */}
            <h1 className="text-[24px] font-bold tracking-tight">
              Findings{' '}
              <span className="text-[14px] font-normal text-fg-mute">
                {agrupado ? (
                  <>
                    {fmtInt(groupList.length)}{' '}
                    {groupList.length === 1 ? 'tipo' : 'tipos'} ·{' '}
                    {fmtInt(ocorrenciasVisiveis)}{' '}
                    {ocorrenciasVisiveis === 1 ? 'ocorrência' : 'ocorrências'}
                  </>
                ) : demo ? (
                  <>
                    {listBeforeSort.length}{' '}
                    {listBeforeSort.length === 1 ? 'aberto' : 'abertos'}
                    {remediados > 0 ? ` · ${remediados} remediados no período` : ''}
                  </>
                ) : (
                  `${listBeforeSort.length} ${listBeforeSort.length === 1 ? 'finding' : 'findings'}`
                )}
              </span>
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-fg-dim">
            {agrupado
              ? 'Cada linha é um tipo de vulnerabilidade, com todas as ocorrências somadas. Abra uma linha para ver os caminhos afetados.'
              : 'Vulnerabilidades encontradas nos scans, das mais críticas para as menos.'}
          </p>
          {/* Os dois tetos existem, mas são de natureza diferente: 1000
              findings na lista plana (comum, o teste dinâmico passa disso sozinho) e 500
              GRUPOS no agrupado (uma trava de segurança que na prática não é
              atingida — hoje são 14). Quando é, a contagem de ocorrências
              também subestima, e isso precisa aparecer. */}
          {truncated && (
            <p className="mt-1 text-[12px] text-fg-mute">
              {agrupado
                ? 'Limite de tipos atingido — a contagem de ocorrências considera apenas os tipos exibidos.'
                : 'Lista limitada aos findings mais recentes — os filtros valem sobre esse subconjunto.'}
            </p>
          )}
          {agrupado && filters.busca && (
            <p className="mt-1 text-[12px] text-fg-mute">
              Nesta visão a busca compara título, CVE/CWE e repositório. Para procurar
              por arquivo, use “Todos”.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="perwrap">
            <div className="perseg">
              <button
                type="button"
                className={`perbtn${agrupado ? ' on' : ''}`}
                onClick={() => setView('grupos')}
              >
                Agrupados
              </button>
              <button
                type="button"
                className={`perbtn${!agrupado ? ' on' : ''}`}
                onClick={() => setView('todos')}
              >
                Todos
              </button>
            </div>
          </div>
          <div className="perwrap">
            <div className="perseg">
              {periodButton('7', '7d')}
              {periodButton('30', '30d')}
              {periodButton('90', '90d')}
              {periodButton('all', 'Tudo')}
            </div>
          </div>
        </div>
      </div>

      {active && (
        <div className="filtbar">
          <span className="filtbar-count">
            {agrupado ? (
              <>
                <b>{fmtInt(groupList.length)}</b> de {fmtInt(groups.length)} tipos ·{' '}
                {fmtInt(ocorrenciasVisiveis)} de {fmtInt(groupsTotal)} ocorrências
              </>
            ) : (
              <>
                <b>{listBeforeSort.length}</b> de {findings.length} findings
              </>
            )}
          </span>
          <div className="filtbar-chips">
            {activeChips.map((chip) => (
              <button key={chip.key} type="button" className="fchip" onClick={chip.onRemove}>
                <span className="fchip-v">{chip.label}</span>
                <span className="fchip-x">×</span>
              </button>
            ))}
          </div>
          <button type="button" className="filtbar-clear" onClick={clearAll}>
            Limpar todos
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="inp"
          style={{ width: 240 }}
          placeholder={
            agrupado ? 'Buscar tipo, CVE, repositório…' : 'Buscar título, arquivo, CVE…'
          }
          aria-label="Buscar findings"
          value={filters.busca}
          onChange={(event) => push({ ...filters, busca: event.target.value, page: 1 })}
        />
        <div className="mx-1 h-6 w-px bg-line" />
        {SEV_STACK.map((sev) => {
          const on = filters.severidades.includes(sev);
          const color = sevColor(sev);
          return (
            <button
              key={sev}
              type="button"
              className={`chip${on ? ' on' : ''}`}
              style={
                on
                  ? {
                      background: hexA(color, 0.12),
                      borderColor: hexA(color, 0.4),
                      color,
                    }
                  : undefined
              }
              onClick={(event) =>
                toggleDim('severidades', sev, event.ctrlKey || event.metaKey)
              }
            >
              <span className="chip-dot" style={{ background: color }} />
              {sev}
              {on && <span className="chip-x">×</span>}
            </button>
          );
        })}
        <div className="mx-1 h-6 w-px bg-line" />
        {SCANNER_LIST.map((scanner) => {
          const on = filters.scanners.includes(scanner);
          return (
            <button
              key={scanner}
              type="button"
              className={`chip${on ? ' on' : ''}`}
              onClick={(event) =>
                toggleDim('scanners', scanner, event.ctrlKey || event.metaKey)
              }
            >
              {sourceLabel(scanner)}
              {on && <span className="chip-x">×</span>}
            </button>
          );
        })}
        <div className="mx-1 h-6 w-px bg-line" />
        {[1, 2, 3].map((tier) => {
          const on = filters.tiers.includes(tier);
          return (
            <button
              key={tier}
              type="button"
              className={`chip${on ? ' on' : ''}`}
              onClick={(event) => toggleDim('tiers', tier, event.ctrlKey || event.metaKey)}
            >
              Tier {tier}
              {on && <span className="chip-x">×</span>}
            </button>
          );
        })}
        {active && (
          <button type="button" className="chip chip-clear" onClick={clearAll}>
            Limpar filtros
          </button>
        )}
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        {agrupado ? (
          <table className="dtbl">
            <colgroup>
              <col style={{ width: 120 }} />
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <thead>
              <tr>
                <th className="sort-h" onClick={() => setSort('sev')}>
                  <span className="dtbl-h">
                    Severidade
                    <SortArrow active={filters.sort.col === 'sev'} dir={filters.sort.dir} />
                  </span>
                </th>
                <th className="cl">Tipo de vulnerabilidade / Repositório</th>
                <th>Origem</th>
                <th>CVE / CWE</th>
                <th className="sort-h" onClick={() => setSort('tier')}>
                  <span className="dtbl-h">
                    Tier
                    <SortArrow active={filters.sort.col === 'tier'} dir={filters.sort.dir} />
                  </span>
                </th>
                <th>Ocorrências</th>
                <th className="sort-h" onClick={() => setSort('when')}>
                  <span className="dtbl-h">
                    Última
                    <SortArrow active={filters.sort.col === 'when'} dir={filters.sort.dir} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
                    {estadoVazio}
                  </td>
                </tr>
              ) : (
                pageGroups.map((group) => {
                  const chave = groupKey(group);
                  const aberto = expandidos.has(chave);
                  const faltam = group.ocorrencias - group.amostra.length;
                  return (
                    <Fragment key={chave}>
                      <tr
                        className="rowlink"
                        aria-expanded={aberto}
                        onClick={() => toggleGrupo(chave)}
                      >
                        <td>
                          <SevBadge severity={group.severity} />
                        </td>
                        <td className="cl" style={{ overflow: 'hidden' }}>
                          <div className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
                            <Chevron open={aberto} />
                            <span
                              className="truncate font-medium text-fg"
                              title={group.title}
                            >
                              {group.title}
                            </span>
                            {group.algum_secret_verificado && (
                              <span
                                className="mono shrink-0 px-1.5 py-0.5 text-[9px]"
                                style={{
                                  color: '#ff2d3d',
                                  background: 'rgba(255,45,61,.1)',
                                  border: '1px solid rgba(255,45,61,.4)',
                                  borderRadius: 999,
                                }}
                              >
                                Verified
                              </span>
                            )}
                          </div>
                          <div className="mono mt-0.5 truncate pl-[17px] text-[10px] text-fg-dim">
                            {group.asset && (
                              <span className="text-fg-mute">{group.asset} · </span>
                            )}
                            {/* "Desde" dá a idade do problema; a coluna Última
                                dá a reincidência. As duas juntas dizem se é
                                antigo e ainda ativo. */}
                            desde {timeAgo(group.primeiro_em, now)}
                          </div>
                        </td>
                        <td>
                          <span className="mono block truncate text-[10px] text-fg-mute">
                            {sourceLabel(group.source)}
                          </span>
                        </td>
                        <td>
                          <span
                            className="mono block truncate text-[10px] text-fg-dim"
                            title={group.cve_id || group.cwe_id || undefined}
                          >
                            {group.cve_id || group.cwe_id || '—'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="mono rounded px-1.5 py-0.5 text-[10px]"
                            style={{
                              background: 'var(--bg-surface-raised)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            T{group.tier}
                          </span>
                        </td>
                        <td>
                          <div
                            className="text-[14px] font-bold text-fg"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {fmtInt(group.ocorrencias)}
                          </div>
                          <div className="text-[10px] text-fg-dim">
                            {fmtInt(group.caminhos)}{' '}
                            {group.caminhos === 1 ? 'caminho' : 'caminhos'}
                          </div>
                        </td>
                        <td>
                          <span
                            className="cursor-help text-[12px] text-fg-dim"
                            title={fmtAbs(group.ultimo_em)}
                          >
                            {timeAgo(group.ultimo_em, now)}
                          </span>
                        </td>
                      </tr>
                      {aberto && (
                        <tr>
                          <td
                            colSpan={7}
                            className="cl"
                            style={{ background: 'var(--bg-surface-raised)' }}
                          >
                            <div className="mono mb-2 text-[9px] uppercase tracking-[.1em] text-fg-mute">
                              Caminhos afetados
                              {faltam > 0
                                ? ` — amostra de ${group.amostra.length} de ${fmtInt(group.ocorrencias)}`
                                : ''}
                            </div>
                            {group.amostra.length === 0 ? (
                              <p className="text-[12px] text-fg-dim">
                                Este detector não reportou caminho para estas ocorrências.
                              </p>
                            ) : (
                              <ul className="grid gap-1">
                                {group.amostra.map((caminho, indice) => (
                                  <li
                                    // O caminho pode repetir (o teste dinâmico reporta a
                                    // mesma URL em ocorrências diferentes), então
                                    // o índice entra na chave.
                                    key={`${caminho}-${indice}`}
                                    className="mono truncate text-[11px] text-fg-dim"
                                    title={caminho}
                                  >
                                    {caminho}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {faltam > 0 && (
                              <button
                                type="button"
                                className="chip chip-clear mt-3"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  drillDown(group);
                                }}
                              >
                                Ver todas as {fmtInt(group.ocorrencias)} ocorrências →
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
        <table className="dtbl">
          <colgroup>
            <col style={{ width: 120 }} />
            <col />
            <col style={{ width: 110 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr>
              <th className="sort-h" onClick={() => setSort('sev')}>
                <span className="dtbl-h">
                  Severidade
                  <SortArrow active={filters.sort.col === 'sev'} dir={filters.sort.dir} />
                </span>
              </th>
              <th className="cl">Título / Repositório · Arquivo</th>
              <th>Origem</th>
              <th>CVE / CWE</th>
              <th className="sort-h" onClick={() => setSort('tier')}>
                <span className="dtbl-h">
                  Tier
                  <SortArrow active={filters.sort.col === 'tier'} dir={filters.sort.dir} />
                </span>
              </th>
              <th className="sort-h" onClick={() => setSort('when')}>
                <span className="dtbl-h">
                  Quando
                  <SortArrow active={filters.sort.col === 'when'} dir={filters.sort.dir} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 0 }}>
                  {estadoVazio}
                </td>
              </tr>
            ) : (
              pageList.map((finding) => (
                <tr
                  key={finding.id}
                  id={`finding-${finding.id}`}
                  style={
                    flash === finding.id
                      ? { boxShadow: 'inset 0 0 0 2px #c22f3d' }
                      : undefined
                  }
                >
                  <td>
                    <SevBadge severity={finding.severity} />
                  </td>
                  <td className="cl" style={{ overflow: 'hidden' }}>
                    <div className="truncate font-medium text-fg" title={finding.title}>
                      {finding.title}
                      {finding.secret_verified && (
                        <span
                          className="mono ml-1.5 px-1.5 py-0.5 text-[9px]"
                          style={{
                            color: '#ff2d3d',
                            background: 'rgba(255,45,61,.1)',
                            border: '1px solid rgba(255,45,61,.4)',
                            borderRadius: 999,
                          }}
                        >
                          Verified
                        </span>
                      )}
                    </div>
                    <div
                      className="mono mt-0.5 truncate text-[10px] text-fg-dim"
                      /* O truncamento esconde justamente o que se usa para
                         achar o arquivo — o `title` devolve o valor inteiro. */
                      title={[
                        finding.asset,
                        `${finding.file_path || '—'}${
                          finding.line_number ? `:${finding.line_number}` : ''
                        }`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    >
                      {/* O repositório vem antes do caminho: com vários repos
                          monitorados, `lib/insecurity.ts` sozinho não diz de
                          qual projeto é — e caminhos comuns (`index.ts`,
                          `config.py`) se repetem entre repositórios. */}
                      {finding.asset && (
                        <span className="text-fg-mute">{finding.asset} · </span>
                      )}
                      {/* Nem todo detector reporta linha (a varredura de
                          credenciais em modo filesystem, por exemplo).
                          `arquivo:?` sugeria dado faltando; sem o sufixo, o
                          caminho fica só correto. */}
                      {finding.file_path || '—'}
                      {finding.line_number ? `:${finding.line_number}` : ''}
                    </div>
                  </td>
                  <td>
                    <span className="mono block truncate text-[10px] text-fg-mute">
                      {sourceLabel(finding.source)}
                    </span>
                  </td>
                  <td>
                    {/* `block truncate` + `title`, igual ao detalhe de
                        relatório: recorta com reticências em vez de cortar
                        seco, e o valor inteiro fica no tooltip. O caso real de
                        estouro é o fallback do normalizador de CWE no
                        back-end, que devolve até 50 caracteres. */}
                    <span
                      className="mono block truncate text-[10px] text-fg-dim"
                      title={finding.cve_id || finding.cwe_id || undefined}
                    >
                      {finding.cve_id || finding.cwe_id || '—'}
                    </span>
                  </td>
                  <td>
                    <span
                      className="mono rounded px-1.5 py-0.5 text-[10px]"
                      style={{
                        background: 'var(--bg-surface-raised)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      T{finding.tier}
                    </span>
                  </td>
                  <td>
                    <span
                      className="cursor-help text-[12px] text-fg-dim"
                      title={fmtAbs(finding.created_at)}
                    >
                      {timeAgo(finding.created_at, now)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}

        {totalItens > pageSize && (
          <div
            className="flex items-center justify-between gap-3"
            style={{ padding: '10px 16px', borderTop: '1px solid var(--border-default)' }}
          >
            <span className="text-[12px] text-fg-dim">
              Mostrando{' '}
              <b style={{ color: 'var(--text-secondary)' }}>
                {pageStart + 1}–{Math.min(pageStart + pageSize, totalItens)}
              </b>{' '}
              de {totalItens} {agrupado ? 'tipos' : ''}
            </span>
            <div className="flex items-center gap-[5px]">
              <button
                type="button"
                className="chip chip-clear"
                disabled={page === 1}
                style={page === 1 ? { opacity: 0.4, cursor: 'default' } : undefined}
                onClick={() => push({ ...filters, page: page - 1 })}
              >
                ‹ Anterior
              </button>
              {pageNumbers(page, totalPages).map((p, index) =>
                p === '…' ? (
                  <span
                    key={`gap-${index}`}
                    className="text-[12px] text-fg-dim"
                    style={{ padding: '0 3px' }}
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`chip${p === page ? ' on' : ''}`}
                    style={{
                      minWidth: 30,
                      justifyContent: 'center',
                      ...(p === page
                        ? {
                            borderColor: 'var(--accent)',
                            color: 'var(--text-primary)',
                            background: 'var(--accent-tint)',
                            fontWeight: 600,
                          }
                        : {}),
                    }}
                    onClick={() => push({ ...filters, page: p })}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                className="chip chip-clear"
                disabled={page === totalPages}
                style={page === totalPages ? { opacity: 0.4, cursor: 'default' } : undefined}
                onClick={() => push({ ...filters, page: page + 1 })}
              >
                Próxima ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
