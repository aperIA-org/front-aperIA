'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  monitoredReposRoute,
  reportDetailRoute,
  SCREEN_ROUTES,
} from '@/lib/dash/dash-routes';
import { useDashState } from '@/lib/dash/dash-state';
import { shortSha, timeAgo, TIER_STATUS_LABEL, riskMax } from '@/lib/dash/format';
import { REMEDIATIONS } from '@/lib/dash/mock-data';
import type { Finding, ScanJob } from '@/lib/dash/types';
import { CountUp } from './CountUp';
import { EmptyState } from './EmptyState';
import { OnboardingFlow } from './OnboardingFlow';
import { RiskGauge } from './RiskGauge';
import { SevBadge } from './SevBadge';
import { SevDonut, type SevCounts } from './SevDonut';

function TierPill({ status }: { status: string | null }) {
  if (!status) return <span className="sev st-skipped" style={{ opacity: 0.4 }}>—</span>;
  return <span className={`sev st-${status}`}>{TIER_STATUS_LABEL[status] ?? status}</span>;
}

/**
 * Tela Início — KPIs, último scan, distribuição por severidade e scans recentes.
 *
 * Os dados chegam por prop: `GET /findings` + `GET /scans` no server component,
 * ou o dataset do protótipo em demonstração.
 */
export function DashHomeScreen({
  findings,
  jobs,
  findingsOk,
  scansOk,
  demo,
  now,
}: {
  findings: Finding[];
  jobs: ScanJob[];
  findingsOk: boolean;
  scansOk: boolean;
  demo: boolean;
  now: number;
}) {
  const router = useRouter();
  const { connected, monitored } = useDashState();

  // Sem guard de `mounted`: a conexão é resolvida no servidor, então o
  // onboarding já vem no HTML do SSR em vez de aparecer depois do 1º efeito.
  if (!connected) return <OnboardingFlow />;

  // Vale tanto para quem acabou de instalar o App (instalar dá visibilidade, não
  // ativa nada) quanto para quem desmarcou tudo depois.
  if (monitored.length === 0) {
    return (
      <div className="page-wrap">
        <div className="mb-6">
          <h1 className="text-[24px] font-bold">Postura de Segurança</h1>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 32 }}>
          <h2 className="mb-2 text-[16px] font-bold">Nenhum repositório monitorado</h2>
          <p className="mx-auto mb-5 max-w-[52ch] text-[13.5px] leading-[1.6] text-fg-mute">
            O GitHub está conectado, mas nenhum repositório está ativado. Selecione ao
            menos um para o aperIA escanear cada pull request e popular o dashboard.
          </p>
          <Link href={monitoredReposRoute} className="btn btn-md btn-primary">
            Selecionar repositórios
          </Link>
        </div>
      </div>
    );
  }

  const counts: SevCounts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };
  const total = findings.length;
  const lastJob: ScanJob | undefined = jobs[0];

  /**
   * O 4º KPI depende da origem do dado. A API não expõe remediações, então com
   * dados reais o lugar é ocupado por Medium — mesma fonte dos outros três, e
   * completa a escada de severidade em vez de anunciar um número inventado.
   */
  const fourthTile = demo
    ? {
        accent: '#d81f2a',
        markBg: '#d81f2a',
        label: 'Remediações',
        value: REMEDIATIONS.filter((r) => r.status === 'suggested').length,
        sub: 'aguardam aprovação',
        href: SCREEN_ROUTES.remediations,
        numClass: '',
      }
    : {
        accent: 'var(--sev-medium)',
        label: 'Medium',
        value: counts.medium,
        sub: 'prioridade média',
        href: `${SCREEN_ROUTES.findings}?sev=medium`,
        numClass: '',
      };

  const tiles: {
    accent: string;
    markBg?: string;
    label: string;
    value: number;
    sub: string;
    href: string;
    numClass: string;
  }[] = [
    {
      accent: '#d81f2a',
      markBg: 'var(--text-primary)',
      label: 'Total de Findings',
      value: total,
      sub: `em ${monitored.length} ${monitored.length === 1 ? 'repositório' : 'repositórios'}`,
      href: SCREEN_ROUTES.findings,
      numClass: '',
    },
    {
      accent: 'var(--sev-critical)',
      label: 'Critical',
      value: counts.critical,
      sub: 'requerem ação imediata',
      href: `${SCREEN_ROUTES.findings}?sev=critical`,
      numClass: 'is-crit',
    },
    {
      accent: 'var(--sev-high)',
      label: 'High',
      value: counts.high,
      sub: 'alta prioridade',
      href: `${SCREEN_ROUTES.findings}?sev=high`,
      numClass: 'is-high',
    },
    fourthTile,
  ];

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold">Postura de Segurança</h1>
      </div>

      {!findingsOk && (
        <div
          role="alert"
          className="mb-4 text-[12.5px] leading-[1.55]"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            color: '#eab308',
            background: 'rgba(234,179,8,.08)',
            border: '1px solid rgba(234,179,8,.22)',
          }}
        >
          Não foi possível carregar os findings — os números abaixo estão zerados por falta
          de dados, não porque não há findings.
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="mb-6">
        <div className="ov-grid" style={{ padding: 0 }}>
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="ov-tile"
              style={{ ['--ov-accent' as string]: tile.accent }}
              onClick={() => router.push(tile.href)}
              role="link"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') router.push(tile.href);
              }}
            >
              <div className="ov-mark" style={tile.markBg ? { background: tile.markBg } : undefined} />
              <div className="ov-lbl">{tile.label}</div>
              <div className={`ov-num ${tile.numClass}`}>
                <CountUp to={tile.value} />
              </div>
              <div className="ov-sub">{tile.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Último scan + distribuição ── */}
      <div className="row-12 mb-6">
        <div
          className="stat-card col-8 flex flex-col"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <div
            className="flex items-center justify-between"
            style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}
          >
            <h2 className="whitespace-nowrap text-[16px] font-bold">Último Scan</h2>
          </div>

          {/* Com dados reais pode não existir execução nenhuma ainda. */}
          {lastJob ? (
            <div
              className="card-link flex flex-1 cursor-pointer items-stretch gap-6"
              style={{ padding: 20 }}
              onClick={() => router.push(reportDetailRoute(lastJob.id))}
              role="link"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter') router.push(reportDetailRoute(lastJob.id));
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-[18px]">
                <div>
                  <div className="lnk text-sm font-medium text-fg">
                    {lastJob.repo_full_name}
                    {/* Scan manual roda sem PR — `#0` seria número inventado. */}
                    {lastJob.pr_number > 0 && ` · PR #${lastJob.pr_number}`}
                  </div>
                  <div className="mono mt-1 text-[12px] text-fg-dim">
                    {shortSha(lastJob.commit_sha)} · {timeAgo(lastJob.created_at, now)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TierPill status={lastJob.tier1_status} />
                  <TierPill status={lastJob.tier2_status} />
                  <TierPill status={lastJob.tier3_status} />
                </div>
              </div>
              {lastJob.final_risk_score !== null && (
                <RiskGauge score={lastJob.final_risk_score} max={riskMax(demo)} />
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center" style={{ padding: 20 }}>
              <p className="max-w-[42ch] text-center text-[13px] leading-[1.6] text-fg-mute">
                {scansOk
                  ? 'Nenhuma execução ainda. Abra um pull request num repositório monitorado, ou inicie um scan manual em Scans.'
                  : 'Não foi possível carregar as execuções.'}
              </p>
            </div>
          )}
        </div>

        <div className="stat-card col-4 flex flex-col" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="flex items-center justify-between"
            style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}
          >
            <h2 className="whitespace-nowrap text-[16px] font-bold">
              Distribuição por Severidade
            </h2>
          </div>
          <div className="flex flex-1 items-center gap-[26px]" style={{ padding: '16px 20px' }}>
            <SevDonut counts={counts} total={total} />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-px">
              {(Object.keys(counts) as (keyof SevCounts)[]).map((sev) => (
                <Link
                  key={sev}
                  href={`${SCREEN_ROUTES.findings}?sev=${sev}`}
                  className="dn-row flex items-center justify-between"
                  style={{ padding: '5px 0' }}
                >
                  <SevBadge severity={sev} />
                  <span
                    className="mono text-[13px] font-semibold text-fg"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {counts[sev]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scans recentes ── */}
      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="flex items-center justify-between"
          style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-default)' }}
        >
          <h2 className="whitespace-nowrap text-[16px] font-bold">Scans Recentes</h2>
          <Link href={SCREEN_ROUTES.pipelines} className="btn btn-sm btn-ghost">
            Ver todos →
          </Link>
        </div>
        {jobs.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState
              title={scansOk ? 'Nenhum scan ainda' : 'Não foi possível carregar os scans'}
              body={
                scansOk
                  ? 'Cada pull request nos repositórios monitorados dispara o scan de 3 tiers.'
                  : 'O aperIA não conseguiu falar com a API. Recarregue a página.'
              }
            />
          </div>
        ) : (
          jobs.slice(0, 5).map((job) => (
            <Link
              key={job.id}
              href={reportDetailRoute(job.id)}
              className="tbl-row"
              style={{ gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr) minmax(0,2fr) auto' }}
            >
              <span className="truncate text-[13px] text-fg">
                {job.repo_full_name.split('/')[1] ?? job.repo_full_name}
                {job.pr_number > 0 && ` · PR #${job.pr_number}`}
              </span>
              <span className="mono text-[12px] text-fg-dim">{shortSha(job.commit_sha)}</span>
              <span className="flex items-center gap-1.5">
                <TierPill status={job.tier1_status} />
                <TierPill status={job.tier2_status} />
                <TierPill status={job.tier3_status} />
              </span>
              <span className="mono text-[12px] text-fg-dim">
                {timeAgo(job.created_at, now)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
