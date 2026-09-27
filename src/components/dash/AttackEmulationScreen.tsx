'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SCREEN_ROUTES } from '@/lib/dash/dash-routes';
import { riskColor, scanRanAt, shortSha, timeAgo } from '@/lib/dash/format';
import { FINDINGS, INSIGHTS, SCAN_JOBS } from '@/lib/dash/mock-data';
import type { ScanJob } from '@/lib/dash/types';
import { AttackChain } from './AttackChain';
import { DemoDataBadge } from './DemoDataBadge';
import { EmptyState } from './EmptyState';
import { PrioritizedActions } from './PrioritizedActions';
import { MiniGauge, RiskGauge } from './RiskGauge';
import { SevBadge } from './SevBadge';

/* ═══════════════════════ ícones ═══════════════════════ */

function IconChevronDown() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: 'var(--text-dim)', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconCheck({ size = 13, color = '#c22f3d' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function IconSpinner({ size = 16, color = '#3b82f6' }: { size?: number; color?: string }) {
  return (
    <svg
      className="spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 11-9-9" />
    </svg>
  );
}

/* ═══════════════════════ seletor de execução ═══════════════════════ */

/** Resumo do desfecho de cada execução na lista do dropdown (`execOutcome`). */
function ExecOutcome({ job }: { job: ScanJob }) {
  if (job.blocked_at_tier === 1 || job.final_risk_level === 'blocked') {
    return (
      <span className="text-[11px]" style={{ color: '#ef4444' }}>
        Bloqueado · Gate 1
      </span>
    );
  }
  if (job.tier2_status === 'failed') {
    return (
      <span className="text-[11px]" style={{ color: '#ef4444' }}>
        Falhou · Tier 2
      </span>
    );
  }
  if (job.tier3_status === 'running') {
    return (
      <span className="flex items-center gap-1 text-[11px]" style={{ color: '#3b82f6' }}>
        <IconSpinner size={10} color="currentColor" />
        Em execução
      </span>
    );
  }
  if (job.final_risk_score != null) {
    return (
      <span className="flex items-center gap-1.5">
        <MiniGauge score={job.final_risk_score} />
        <span
          className="mono text-[11px] font-semibold"
          style={{ color: riskColor(job.final_risk_score) }}
        >
          {job.final_risk_score}
        </span>
      </span>
    );
  }
  return <span className="text-[11px] text-fg-dim">—</span>;
}

/**
 * Seletor da execução analisada.
 *
 * No protótipo a escolha era estado de módulo (`currentExecId`); aqui vira
 * `?scan=<id>` na URL, então cada análise é um link compartilhável.
 */
function ExecSelect({ job }: { job: ScanJob }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const q = query.toLowerCase().trim();
  const matches = SCAN_JOBS.filter(
    (j) =>
      !q ||
      j.repo_full_name.toLowerCase().includes(q) ||
      `pr #${j.pr_number}`.includes(q) ||
      String(j.pr_number).includes(q.replace('#', '')),
  );

  const isLatest = job.id === SCAN_JOBS[0].id;

  return (
    <div ref={wrapRef} className="mt-2 flex items-center gap-2" style={{ position: 'relative' }}>
      <button
        type="button"
        className="exec-select"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="text-[13px] text-fg-dim">
          {job.repo_full_name} · PR #{job.pr_number} ·{' '}
          <span className="mono text-[12px]">{shortSha(job.commit_sha)}</span> ·{' '}
          {timeAgo(scanRanAt(job))}
        </span>
        <IconChevronDown />
      </button>

      {isLatest && (
        <span
          className="text-[10px] font-semibold"
          style={{
            padding: '2px 7px',
            borderRadius: 4,
            background: 'var(--bg-surface-raised)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--divider)',
          }}
        >
          Mais recente
        </span>
      )}

      <div className={`exec-dd${open ? ' open' : ''}`}>
        <div className="exec-dd-search">
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar por repositório ou PR..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="exec-dd-list">
          {matches.map((option) => (
            <Link
              key={option.id}
              href={`${SCREEN_ROUTES.attack}?scan=${option.id}`}
              className="exec-opt"
              onClick={() => setOpen(false)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {option.id === job.id ? (
                  <IconCheck />
                ) : (
                  <span style={{ width: 13, flexShrink: 0 }} />
                )}
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <span className="block truncate text-[12.5px] text-fg">
                    {option.repo_full_name} · PR #{option.pr_number}
                  </span>
                  <span className="text-[11px] text-fg-dim">
                    <span className="mono">{shortSha(option.commit_sha)}</span> ·{' '}
                    {timeAgo(scanRanAt(option))}
                  </span>
                </span>
              </span>
              <span style={{ flexShrink: 0, marginLeft: 12 }}>
                <ExecOutcome job={option} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenHead({ job }: { job: ScanJob }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.04em] text-fg-mute">
        Análise Profunda · Tier 3
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h1 className="text-[24px] font-bold tracking-tight">AI Emulation</h1>
        <DemoDataBadge className="flex-shrink-0" />
      </div>
      <ExecSelect job={job} />
    </div>
  );
}

/** "Ver na aba Scans" — era `onclick="navigate('pipelines')"`. */
function PipelinesLink() {
  return (
    <Link
      href={SCREEN_ROUTES.pipelines}
      className="btn btn-sm btn-ghost mt-3"
      style={{ gap: 6 }}
    >
      Ver na aba Scans
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

/** Selo verde de engine disponível (Threat Intel / Emulation). */
function EngineBadge({ label, title }: { label: string; title: string }) {
  return (
    <span
      title={title}
      className="cursor-help"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        padding: '3px 9px',
        borderRadius: 4,
        background: 'rgba(34,197,94,.12)',
        color: '#22c55e',
        border: '1px solid rgba(34,197,94,.3)',
      }}
    >
      {label}
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12l5 5L20 7" />
      </svg>
    </span>
  );
}

/* ═══════════════════════ tela ═══════════════════════ */

export function AttackEmulationScreen() {
  const searchParams = useSearchParams();
  const scanParam = searchParams.get('scan');

  if (SCAN_JOBS.length === 0) {
    return (
      <div className="page-wrap">
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-[24px] font-bold tracking-tight">AI Emulation</h1>
          <DemoDataBadge className="flex-shrink-0" />
        </div>
        <div className="stat-card">
          <EmptyState
            title="Nenhuma execução para analisar"
            body="Assim que um scan rodar o Tier 3, a análise de attack path da I.A aparece aqui, com kill chain, risk score e ações priorizadas."
            action={
              <Link href={SCREEN_ROUTES.integrations} className="btn btn-md btn-primary">
                Configurar scanners
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  /**
   * Sem `?scan=`, abre a execução que TEM attack path completa — é a análise
   * que a tela existe para mostrar. As demais ficam acessíveis pelo seletor.
   */
  const job = scanParam
    ? SCAN_JOBS.find((j) => j.id === scanParam)
    : SCAN_JOBS.find((j) => INSIGHTS[j.id]?.attack_path) ?? SCAN_JOBS[0];

  if (!job) {
    return (
      <div className="page-wrap">
        <p className="text-fg-dim">Nenhuma execução disponível.</p>
      </div>
    );
  }

  const insight = INSIGHTS[job.id];

  /* Estado: bloqueado no Gate 1 (secret verificado) */
  if (job.final_risk_level === 'blocked' || job.blocked_at_tier === 1) {
    const secret = FINDINGS.find((f) => f.secret_verified);
    return (
      <div className="page-wrap">
        <ScreenHead job={job} />
        <div className="stat-card">
          <div className="mb-3 flex items-center gap-3">
            <span className="sev st-blocked">Gate 1 · bloqueado</span>
            <h2 className="text-[16px] font-bold">Scan Bloqueado no Gate 1</h2>
          </div>
          <p className="mb-4 text-[13px] leading-relaxed text-fg-mute">
            Um secret verificado interrompeu o scan no Tier 1 antes de qualquer análise
            posterior. Resolva o secret e re-execute para liberar os Tiers 2 e 3.
          </p>
          {secret && (
            <Link
              href={`${SCREEN_ROUTES.findings}?finding=${secret.id}`}
              className="ap-fcard"
              style={{ borderLeft: '2px solid #ef4444' }}
            >
              <SevBadge severity={secret.severity} />
              <span className="text-[12px] text-fg-mute">{secret.title}</span>
              <span className="mono text-[10px] text-fg-dim">
                {secret.file_path}:{secret.line_number}
              </span>
            </Link>
          )}
          <PipelinesLink />
        </div>
      </div>
    );
  }

  /* Estado: Tier 2 falhou, interrupção */
  if (job.tier2_status === 'failed') {
    return (
      <div className="page-wrap">
        <ScreenHead job={job} />
        <div className="stat-card">
          <div className="mb-3 flex items-center gap-3">
            <span className="sev st-failed">Tier 2 · falhou</span>
            <h2 className="text-[16px] font-bold">Análise Interrompida</h2>
          </div>
          <p className="text-[13px] leading-relaxed text-fg-mute">
            O scan parou no Tier 2 (falha de execução) após concluir o Tier 1 em{' '}
            {job.t1_dur || '—'}. A análise profunda (Tier 3) não chegou a rodar e nenhuma
            attack path foi gerada para esta execução.
          </p>
          <PipelinesLink />
        </div>
      </div>
    );
  }

  /* Estado: Tier 3 em execução, parcial ao vivo */
  if (job.tier3_status === 'running') {
    return (
      <div className="page-wrap">
        <ScreenHead job={job} />
        <div className="stat-card mb-6">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[.04em] text-fg-mute">
            Tiers concluídos
          </div>
          <div className="flex items-center gap-4 text-[13px] text-fg-mute">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}
              />
              Tier 1 · {job.t1_dur || '—'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}
              />
              Tier 2 · {job.t2_dur || '—'}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="mb-2 flex items-center gap-3">
            <IconSpinner />
            <h2 className="text-[16px] font-bold">Análise Profunda em Execução</h2>
          </div>
          <p className="text-[13px] leading-relaxed text-fg-mute">
            O Tier 3 (I.A + emulação de adversário) está processando esta execução. A attack path
            e o risk score ajustado aparecerão aqui assim que a análise concluir.
          </p>
        </div>
      </div>
    );
  }

  /* Estado: Tier 3 pulado pelo Gate 2, finalizado no Tier 2 */
  if (job.tier3_status === 'skipped') {
    return (
      <div className="page-wrap">
        <ScreenHead job={job} />
        <div className="stat-card mb-6">
          <div className="flex items-center gap-4">
            {job.final_risk_score != null && <RiskGauge score={job.final_risk_score} />}
            <div style={{ width: 1, height: 50, background: 'var(--gauge-track)' }} />
            <div className="flex-1">
              <div className="mb-1 text-[14px] font-semibold text-fg">
                Análise Tier 2 consolidada
              </div>
              <p className="text-[13px] leading-relaxed text-fg-mute">
                {insight?.tier2_summary ?? 'Análise Tier 2 concluída.'}
              </p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <h2 className="mb-2 text-[16px] font-bold">Attack Path Não Gerada</h2>
          <p className="text-[13px] leading-relaxed text-fg-mute">
            Scan finalizado no Tier 2, apenas findings de baixa severidade, então o Gate 2
            não escalou para a análise profunda. Os findings desta execução estão
            disponíveis na aba Findings.
          </p>
          <PipelinesLink />
        </div>
      </div>
    );
  }

  /* Estado completo: Tier 3 concluído com attack path */
  const attackPath = insight?.attack_path;
  if (!attackPath) {
    return (
      <div className="page-wrap">
        <ScreenHead job={job} />
        <div className="stat-card">
          <h2 className="mb-2 text-[16px] font-bold">Sem Attack Path Nesta Execução</h2>
          <p className="text-[13px] leading-relaxed text-fg-mute">
            Não há dados de análise profunda para esta execução.
          </p>
          <PipelinesLink />
        </div>
      </div>
    );
  }

  const findingCount = new Set(attackPath.flatMap((step) => step.finding_ids)).size;

  return (
    <div className="page-wrap">
      <ScreenHead job={job} />

      <div className="stat-card mb-6">
        <div className="flex items-center gap-5">
          {job.final_risk_score != null && <RiskGauge score={job.final_risk_score} />}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--gauge-track)' }} />
          <div className="flex-1">
            <div
              className="mb-2 flex items-center gap-2 text-fg"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8" />
              </svg>
              Kill chain {insight?.kill_chain_complete ? 'completa' : 'incompleta'},{' '}
              {attackPath.length} passos mapeados em MITRE ATT&CK
            </div>
            <p className="text-[13px] leading-relaxed text-fg-mute">
              A partir de {findingCount} findings desta execução.
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2"
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <EngineBadge
            label="Threat Intel"
            title="Exploração conhecida e probabilidade de ataque por CVE"
          />
          <EngineBadge label="Emulation" title="Emulação de adversário sobre o alvo" />
        </div>
      </div>

      {/* `key` por execução: trocar de scan reinicia a narrativa da cadeia. */}
      <AttackChain key={job.id} steps={attackPath} />

      {insight?.prioritized_actions && (
        <PrioritizedActions actions={insight.prioritized_actions} />
      )}
    </div>
  );
}
