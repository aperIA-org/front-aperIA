'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { requestManualScan } from '@/lib/api/github-actions';
import { reportDetailRoute, SCREEN_ROUTES } from '@/lib/dash/dash-routes';
import { useDashState } from '@/lib/dash/dash-state';
import { fmtAbs, riskColor, riskMax, scanRanAt, shortSha, timeAgo } from '@/lib/dash/format';
import {
  GH_ORG,
  INSTALLATION_REPOS,
  REF_NOW,
  REMEDIATIONS,
} from '@/lib/dash/mock-data';
import type { ScanJob } from '@/lib/dash/types';
import { EmptyState } from './EmptyState';
import { TierStepper } from './TierStepper';
import { MiniGauge } from './RiskGauge';
import { IconPlay, ScanModal, Spinner, type ScanTarget } from './ScanModal';

/* ═══════════════════════ status derivado do scan ═══════════════════════ */

type PipeStatus = 'blocked' | 'failed' | 'running' | 'done';

/** Estados a partir dos quais um tier não muda mais. */
const TIER_TERMINAL = ['done', 'failed', 'skipped'];

function pipeStatus(job: ScanJob): PipeStatus {
  if (job.blocked_at_tier === 1 || job.final_risk_level === 'blocked') return 'blocked';
  if (job.tier2_status === 'failed' || job.tier3_status === 'failed') return 'failed';
  if (
    job.tier1_status === 'running' ||
    job.tier2_status === 'running' ||
    job.tier3_status === 'running'
  ) {
    return 'running';
  }

  // Nenhum tier `running` NÃO significa concluído. Entre o fim do Tier 1 e o
  // início do Tier 2 existe uma janela em que `tier2_status` ainda é `null` —
  // o pipeline está andando, mas nada está marcado como `running`.
  //
  // Tratar isso como 'done' tinha dois efeitos ruins: o Tier 2 nunca aparecia
  // "em execução", e o polling desta tela (que só roda enquanto há job em
  // andamento) desligava exatamente nessa janela — e como só um refresh traria
  // o estado novo, ele nunca voltava a ligar. A tela congelava com o Tier 1
  // concluído e o resto vazio.
  //
  // O pipeline só terminou quando o Tier 3 alcançou um estado terminal.
  if (job.tier3_status && TIER_TERMINAL.includes(job.tier3_status)) return 'done';
  return 'running';
}

/** Tier mais profundo que o scan realmente alcançou (skipped não conta). */
function pipeTierReached(job: ScanJob): number {
  if (job.tier3_status && job.tier3_status !== 'skipped') return 3;
  if (job.tier2_status && job.tier2_status !== 'skipped') return 2;
  return 1;
}

function isJobRunning(job: ScanJob): boolean {
  return pipeStatus(job) === 'running';
}

/* ═══════════════════════ tier stepper completo ═══════════════════════ */


/* ═══════════════════════ risk score compacto ═══════════════════════ */

function RiskCompact({
  score,
  level,
  max,
}: {
  score: number | null;
  level: string | null;
  max: number;
}) {
  if (score == null) {
    return <span className="mono text-[11px] text-fg-dim">{level || '—'}</span>;
  }
  return (
    <span className="flex items-center gap-1.5">
      <MiniGauge score={score} max={max} />
      <span className="mono text-[13px] font-semibold" style={{ color: riskColor(score, max) }}>
        {score}
      </span>
    </span>
  );
}

/* ═══════════════════════ scans iniciados na hora ═══════════════════════ */

/** FNV-1a: dá sha e número de PR estáveis onde o protótipo usava Math.random(). */
function hash32(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function buildScanJob(repoName: string, seq: number): ScanJob {
  const h = hash32(`${repoName}#${seq}`);
  return {
    id: `run_${seq}_${repoName}`,
    commit_sha: h.toString(16).padStart(8, '0').repeat(2).slice(0, 10),
    repo_full_name: `${GH_ORG}/${repoName}`,
    pr_number: 20 + (h % 80),
    tier1_status: 'running',
    tier2_status: null,
    tier3_status: null,
    blocked_at_tier: null,
    final_risk_score: null,
    final_risk_level: null,
    // Relógio congelado: `new Date()` real faria os tempos relativos derivarem.
    created_at: new Date(REF_NOW).toISOString(),
    t1_dur: null,
    t2_dur: null,
    t3_dur: null,
  };
}

/* ═══════════════════════ filtros ═══════════════════════ */

type Filters = {
  repo: string | null;
  status: PipeStatus | null;
  tier: number | null;
};

const EMPTY_FILTERS: Filters = { repo: null, status: null, tier: null };

/** Quantos scans um repo mostra quando o histórico está expandido. */
const HISTORICO_MAX = 10;

const STATUS_OPTIONS: [PipeStatus, string][] = [
  ['done', 'Concluído'],
  ['running', 'Em execução'],
  ['failed', 'Falhou'],
  ['blocked', 'Bloqueado'],
];

/* ═══════════════════════ tela ═══════════════════════ */

export function ScansScreen({
  jobs: serverJobs,
  ok,
  demo,
  now,
}: {
  /** `GET /scans` no server component, ou o dataset do protótipo. */
  jobs: ScanJob[];
  /** `false` = a API não respondeu. Diferente de "nenhuma execução". */
  ok: boolean;
  demo: boolean;
  /** Âncora de tempo: `REF_NOW` em demonstração, o agora real com a API. */
  now: number;
}) {
  const router = useRouter();
  const { monitored } = useDashState();

  /**
   * Estado local SÓ do modo demonstração: é lá que a tela fabrica execuções e
   * o polling conclui o Tier 3 do `s2`. Com dados reais a lista é sempre a do
   * servidor — depois de um scan manual a Server Action revalida `/dash` e a
   * execução nova chega por aqui, sem cópia local para sair de sincronia.
   */
  const [demoJobs, setDemoJobs] = useState<ScanJob[]>(() => serverJobs);
  const jobs = demo ? demoJobs : serverJobs;
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  // Repos com o histórico expandido. Por padrão cada repo mostra só o último
  // scan — a lista completa não escala quando um repo acumula execuções.
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(() => new Set());
  const toggleRepoExpanded = (repo: string) =>
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repo)) next.delete(repo);
      else next.add(repo);
      return next;
    });
  const [modalOpen, setModalOpen] = useState(false);
  const [startedCount, setStartedCount] = useState(0);
  const [scanFeedback, setScanFeedback] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [scanPending, startScanTransition] = useTransition();

  /**
   * Polling da tela: o protótipo re-renderizava a cada 3s e, no 4º tick,
   * concluía o Tier 3 do scan `s2`. Aqui o intervalo é limpo no unmount e é
   * no-op quando o usuário pede menos movimento.
   */
  useEffect(() => {
    // Só encena sobre o dataset do protótipo: com dados reais isso reescreveria
    // o status de uma execução de verdade a partir de um id mock (`s2`).
    if (!demo) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let tick = 0;
    const interval = window.setInterval(() => {
      tick += 1;
      if (tick < 4) return;

      setDemoJobs((prev) =>
        prev.map((job) =>
          job.id === 's2'
            ? {
                ...job,
                tier3_status: 'done',
                final_risk_score: 412,
                final_risk_level: 'high',
                t3_dur: '9m',
              }
            : job,
        ),
      );
      window.clearInterval(interval);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [demo]);

  /**
   * Com dados reais a lista precisa envelhecer sozinha.
   *
   * A tela é renderizada no servidor uma vez; o pipeline avança em background e
   * nada aqui saberia. O efeito colateral era pior que uma lista desatualizada:
   * `fullNameScanRunning` desabilita o repositório no modal "Iniciar scan", e
   * como o snapshot congelava com o job em `running`, o repositório ficava
   * **permanentemente bloqueado** — sem nenhuma requisição chegar à API, o que
   * torna o sintoma invisível nos logs do servidor.
   *
   * `router.refresh()` re-executa o server component e traz `jobs` novos. O
   * intervalo só existe enquanto há execução em andamento: nada rodando,
   * nada a atualizar.
   */
  useEffect(() => {
    if (demo) return;
    if (!serverJobs.some(isJobRunning)) return;

    const interval = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [demo, serverJobs, router]);

  /** Em demonstração o repositório é identificado pelo nome curto sob `GH_ORG`. */
  const repoScanRunning = useCallback(
    (name: string) =>
      jobs.some((job) => job.repo_full_name === `${GH_ORG}/${name}` && isJobRunning(job)),
    [jobs],
  );

  /** Com dados reais o casamento é pelo `full_name` do repositório monitorado. */
  const fullNameScanRunning = useCallback(
    (fullName: string) =>
      jobs.some((job) => job.repo_full_name === fullName && isJobRunning(job)),
    [jobs],
  );

  /**
   * Alvos do modal.
   *
   * Com conexão real são os repositórios monitorados, e a chave é o
   * `repository_id` que a API espera. Em modo demonstração continuam sendo os
   * repositórios do protótipo, identificados pelo nome.
   */
  const scanTargets = useMemo<ScanTarget[]>(() => {
    if (demo) {
      return INSTALLATION_REPOS.map((repo) => ({
        key: repo.name,
        label: `${GH_ORG}/${repo.name}`,
        meta: `${repo.lang} · ${repo.private ? 'privado' : 'público'}`,
        disabled: repoScanRunning(repo.name),
      }));
    }
    return monitored.map((repo) => ({
      key: repo.id,
      label: repo.full_name,
      meta: `branch ${repo.default_branch}`,
      disabled: fullNameScanRunning(repo.full_name),
    }));
  }, [demo, monitored, repoScanRunning, fullNameScanRunning]);

  /**
   * Inicia um scan em UM repositório, na hora.
   *
   * Fora do modo demonstração isto chama `POST /repositories/{id}/scan`, que
   * resolve o HEAD do branch default e enfileira o mesmo pipeline que um pull
   * request dispararia. A Server Action revalida `/dash`, então a execução nova
   * entra na lista abaixo — que agora lê a API, não mais o dataset do protótipo.
   */
  const startScan = useCallback(
    (key: string) => {
      if (demo) {
        if (repoScanRunning(key)) return;
        const seq = startedCount + 1;
        setStartedCount(seq);
        setDemoJobs((prev) => [buildScanJob(key, seq), ...prev]);
        setModalOpen(false);
        return;
      }

      setScanFeedback(null);
      startScanTransition(async () => {
        const result = await requestManualScan(key);
        setScanFeedback({
          ok: result.ok,
          message: result.ok
            ? result.commitSha
              ? `Scan enfileirado no commit ${shortSha(result.commitSha)}.`
              : 'Scan enfileirado.'
            : result.message,
        });
      });
    },
    [demo, repoScanRunning, startedCount],
  );

  const filtered = useMemo(
    () =>
      jobs.filter(
        (job) =>
          (!filters.repo || job.repo_full_name === filters.repo) &&
          (!filters.status || pipeStatus(job) === filters.status) &&
          (!filters.tier || pipeTierReached(job) === filters.tier),
      ),
    [jobs, filters],
  );

  /** Histórico por repositório: agrupa os scans por repo (mais recente primeiro). */
  const groups = useMemo(() => {
    const byRepo = new Map<string, ScanJob[]>();
    filtered.forEach((job) => {
      const bucket = byRepo.get(job.repo_full_name);
      if (bucket) bucket.push(job);
      else byRepo.set(job.repo_full_name, [job]);
    });
    return [...byRepo.entries()].map(([repo, list]) => ({
      repo,
      jobs: [...list].sort(
        (a, b) => Date.parse(scanRanAt(b)) - Date.parse(scanRanAt(a)),
      ),
    }));
  }, [filtered]);

  const repos = useMemo(
    () => [...new Set(jobs.map((job) => job.repo_full_name))],
    [jobs],
  );

  const runningCount = jobs.filter(isJobRunning).length;
  const anyFilter = !!(filters.repo || filters.status || filters.tier);

  const toggleFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }));

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  return (
    <div className="page-wrap pipe-wrap">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="text-[24px] font-bold tracking-tight">
              Scans{' '}
              <span className="text-[14px] font-normal text-fg-mute">
                {jobs.length} no total
              </span>
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-fg-dim">
            Histórico de varreduras por repositório
            {runningCount > 0 ? ` · ${runningCount} em execução` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-[7px] text-[12px] text-fg-mute">
            <span
              className="dot-safe"
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}
            />
            Atualização automática
          </span>
          <button
            type="button"
            className="btn btn-md btn-primary"
            style={{ gap: 8 }}
            onClick={() => setModalOpen(true)}
          >
            <IconPlay />
            Iniciar scan
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          className="inp"
          style={{ height: 32, fontSize: 12.5, maxWidth: 280, cursor: 'pointer' }}
          aria-label="Filtrar por repositório"
          value={filters.repo ?? ''}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, repo: event.target.value || null }))
          }
        >
          <option value="">Todos os repositórios</option>
          {repos.map((repo) => (
            <option key={repo} value={repo}>
              {repo}
            </option>
          ))}
        </select>

        <div className="mx-1 h-6 w-px bg-line" />

        {STATUS_OPTIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`chip${filters.status === value ? ' on' : ''}`}
            onClick={() => toggleFilter('status', value)}
          >
            {label}
            {filters.status === value && <span className="chip-x">×</span>}
          </button>
        ))}

        <div className="mx-1 h-6 w-px bg-line" />

        {[1, 2, 3].map((tier) => (
          <button
            key={tier}
            type="button"
            className={`chip${filters.tier === tier ? ' on' : ''}`}
            onClick={() => toggleFilter('tier', tier)}
          >
            Tier {tier}
            {filters.tier === tier && <span className="chip-x">×</span>}
          </button>
        ))}

        {anyFilter && (
          <button type="button" className="chip chip-clear" onClick={clearFilters}>
            Limpar filtros
          </button>
        )}
      </div>

      {groups.length > 0 ? (
        groups.map((group) => (
          <div key={group.repo} className="mb-8">
            <div
              className="mb-3 flex items-center gap-2"
              style={{ paddingBottom: 8, borderBottom: '1px solid var(--border-default)' }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="text-fg-dim"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span className="text-[15px] font-semibold">{group.repo}</span>
              <span className="text-[12px] text-fg-dim">
                · {group.jobs.length} scan{group.jobs.length === 1 ? '' : 's'} · último{' '}
                {timeAgo(scanRanAt(group.jobs[0]), now)}
              </span>
            </div>

            {(() => {
              const isExpanded = expandedRepos.has(group.repo);
              // Colapsado: só o último. Expandido: até 10 mais recentes.
              const visible = isExpanded
                ? group.jobs.slice(0, HISTORICO_MAX)
                : group.jobs.slice(0, 1);
              const extras = group.jobs.length - 1;
              return (
                <>
                  {visible.map((job) => (
                    <ScanCard key={job.id} job={job} demo={demo} now={now} />
                  ))}
                  {extras > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleRepoExpanded(group.repo)}
                      className="lnk mt-1 text-[12.5px] text-fg-dim"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded
                        ? 'Mostrar menos'
                        : `Ver mais ${Math.min(extras, HISTORICO_MAX - 1)} scan${
                            Math.min(extras, HISTORICO_MAX - 1) === 1 ? '' : 's'
                          }`}
                      {isExpanded && group.jobs.length > HISTORICO_MAX
                        ? ` (mostrando os ${HISTORICO_MAX} mais recentes de ${group.jobs.length})`
                        : ''}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        ))
      ) : !ok ? (
        <div className="stat-card">
          <EmptyState
            title="Não foi possível carregar os scans"
            body="O aperIA não conseguiu falar com a API. Recarregue a página; se persistir, verifique se sua sessão ainda é válida."
          />
        </div>
      ) : jobs.length === 0 ? (
        <div className="stat-card">
          <EmptyState
            title="Nenhum scan ainda"
            body="Cada pull request nos repositórios monitorados dispara o scan de 3 tiers. Você também pode iniciar um scan manual agora."
            action={
              <Link href={SCREEN_ROUTES.integrations} className="btn btn-md btn-primary">
                Configurar scanners
              </Link>
            }
          />
        </div>
      ) : (
        <div className="stat-card">
          <EmptyState
            title="Nenhuma execução com esses filtros"
            body="Ajuste ou limpe os filtros para ver as execuções do histórico."
            action={
              <button type="button" className="chip chip-clear" onClick={clearFilters}>
                Limpar filtros
              </button>
            }
          />
        </div>
      )}

      <ScanModal
        open={modalOpen}
        targets={scanTargets}
        subtitle={
          demo
            ? 'Escolha o repositório para escanear agora.'
            : 'O scan roda no HEAD do branch default e aparece no histórico assim que o pipeline enfileira.'
        }
        pending={scanPending}
        feedback={scanFeedback}
        onClose={() => {
          setModalOpen(false);
          setScanFeedback(null);
        }}
        onStart={startScan}
      />
    </div>
  );
}

/**
 * Card de um scan.
 *
 * O destino do clique depende da origem do dado: em demonstração abre as
 * remediações DESTE scan, como no protótipo. Com dados reais vai para o
 * relatório do commit — a API não expõe remediações, e mandar um id real para
 * uma tela mock levaria a uma lista vazia.
 */
function ScanCard({ job, demo, now }: { job: ScanJob; demo: boolean; now: number }) {
  const running = isJobRunning(job);
  const gate1Blocked = job.final_risk_level === 'blocked';
  const remCount = demo
    ? REMEDIATIONS.filter((rem) => rem.scan_job_id === job.id).length
    : 0;

  return (
    <Link
      href={
        demo
          ? `${SCREEN_ROUTES.remediations}?scan=${job.id}`
          : reportDetailRoute(job.id)
      }
      className="stat-card card-link mb-3 block"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="mono text-[12.5px] font-semibold text-fg">
              PR #{job.pr_number}
            </span>
            <span className="mono text-[11px] text-fg-dim">
              commit {shortSha(job.commit_sha)}
            </span>
            {running && (
              <span className="sev st-running" style={{ gap: 4 }}>
                <Spinner />
                em execução
              </span>
            )}
            {gate1Blocked && <span className="sev st-blocked">gate1 bloqueado</span>}
          </div>
          <div className="mt-0.5 text-[12px] text-fg-dim">
            <span title={fmtAbs(scanRanAt(job))} className="cursor-help">
              {timeAgo(scanRanAt(job), now)}
            </span>
            {remCount > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  {remCount} remediaç{remCount === 1 ? 'ão' : 'ões'}
                </span>
              </>
            )}
          </div>
        </div>

        <RiskCompact
          score={job.final_risk_score}
          level={job.final_risk_level}
          max={riskMax(demo)}
        />
      </div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-default)' }}>
        <div style={{ maxWidth: 700 }}>
          <TierStepper job={job} />
        </div>
      </div>
    </Link>
  );
}
