'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DisconnectModal } from '@/components/dash/DisconnectModal';
import { GitHubMark } from '@/components/dash/GitHubMark';
import { RepoSelector } from '@/components/dash/RepoSelector';
import { SCREEN_ROUTES } from '@/lib/dash/dash-routes';
import { useDashState } from '@/lib/dash/dash-state';
import { fmtAbs, STATUS_PT, timeAgo } from '@/lib/dash/format';
import { GH_ORG, INTEGRATIONS } from '@/lib/dash/mock-data';
import type { Integration } from '@/lib/dash/types';

/** Sem conexão nada roda — o status de execução é neutralizado para "idle". */
const STATUS_CLASS: Record<string, string> = {
  operational: 'st-done',
  degraded: 'st-queued',
  offline: 'st-failed',
  idle: 'st-skipped',
};

function IconWarning() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#eab308"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-px flex-shrink-0"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function IntegrationCard({
  integration,
  connected,
}: {
  integration: Integration;
  connected: boolean;
}) {
  const statusKey = connected ? integration.status : 'idle';
  const statusClass = STATUS_CLASS[statusKey] ?? 'st-skipped';
  const statusLabel = connected
    ? (STATUS_PT[integration.status] ?? integration.status)
    : 'Inativo';
  const showImpact =
    connected && integration.status !== 'operational' && !!integration.impact;

  return (
    <div className="stat-card relative">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold">{integration.name}</span>
            <span
              className="mono rounded-xs border px-1.5 py-0.5 text-[9px]"
              style={{
                color: 'var(--text-dim)',
                borderColor: 'var(--gauge-track)',
                background: 'var(--bg-surface-raised)',
              }}
            >
              {integration.tier}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-fg-dim">{integration.desc}</p>
          {showImpact && (
            <div
              className="mt-2 flex items-start gap-1.5 text-[12px] leading-[1.45]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <IconWarning />
              <span>
                {integration.impact} · {timeAgo(integration.last_run)}
              </span>
            </div>
          )}
        </div>
        <span className={`sev ${statusClass}`}>{statusLabel}</span>
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-[12px] text-fg-dim">
        <span className="mono">v{integration.version}</span>
        {connected ? (
          <>
            <span title={fmtAbs(integration.last_run)} className="cursor-help">
              última execução: {timeAgo(integration.last_run)}
            </span>
            {integration.findings_total !== null ? (
              integration.findings_total > 0 ? (
                <span style={{ color: '#f97316' }}>
                  {integration.findings_total} findings
                </span>
              ) : (
                <span>0 findings</span>
              )
            ) : (
              <span>Engine de IA</span>
            )}
          </>
        ) : (
          <>
            <span>última execução: —</span>
            <span>— findings</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function RepositoriosPage() {
  const router = useRouter();
  const { connected, mounted, monitored, ghInstalledAt, setMonitored, disconnect } =
    useDashState();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!mounted) return null;

  const monitoredCount = monitored.length;

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight">Repositórios</h1>
        <p className="mt-1 text-[13px] text-fg-dim">Conexões e repositórios do aperIA</p>
      </div>

      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-mute">
        Conexões
      </div>

      <div className="stat-card mb-2 flex items-center gap-4">
        <div
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg"
          style={{ background: 'var(--bg-surface-raised)' }}
        >
          <GitHubMark fill={connected ? '#f2f2f2' : '#a1a1a1'} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-semibold">
              {connected ? `GitHub · ${GH_ORG}` : 'GitHub'}
            </span>
            <span className={`sev ${connected ? 'st-done' : 'st-skipped'}`}>
              {connected ? 'Connected' : 'Não conectado'}
            </span>
          </div>
          <div className="mt-1 text-[12.5px] text-fg-dim">
            {connected
              ? `Instalado ${timeAgo(ghInstalledAt)} · ${monitoredCount} ${
                  monitoredCount === 1
                    ? 'repositório monitorado'
                    : 'repositórios monitorados'
                }`
              : 'Conecte para monitorar repositórios e executar scans'}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2.5">
          {connected ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="cursor-pointer border-none bg-transparent p-1.5 text-[12.5px] text-fg-dim underline"
            >
              Desconectar
            </button>
          ) : (
            <Link
              href={SCREEN_ROUTES.home}
              className="btn btn-sm btn-primary"
              style={{ gap: 7 }}
            >
              <GitHubMark size={13} />
              Conectar GitHub
            </Link>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border-default)', margin: '24px 0' }} />

      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-mute">
        Gerenciar repositórios
      </div>

      {connected ? (
        <>
          <p className="mb-3 text-[13px] text-fg-dim" style={{ marginTop: -4 }}>
            Selecione os repositórios do GitHub para rodar os scans do aperIA.
          </p>
          <RepoSelector
            initialSelection={monitored}
            submitLabel="Salvar seleção"
            onSubmit={setMonitored}
          />
        </>
      ) : (
        <div className="stat-card" style={{ textAlign: 'center', padding: 32 }}>
          <h2 className="mb-2 text-[15px] font-semibold">Conecte o GitHub</h2>
          <p className="mx-auto mb-5 max-w-[52ch] text-[13px] leading-[1.6] text-fg-mute">
            Conecte sua conta do GitHub para listar e selecionar os repositórios que serão
            escaneados.
          </p>
          <Link href={SCREEN_ROUTES.home} className="btn btn-md btn-primary">
            Conectar GitHub
          </Link>
        </div>
      )}

      <div style={{ height: 1, background: 'var(--border-default)', margin: '24px 0' }} />

      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-mute">
        Scanners e engines
      </div>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      >
        {INTEGRATIONS.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            connected={connected}
          />
        ))}
      </div>

      <DisconnectModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          disconnect();
          setConfirmOpen(false);
          router.push(SCREEN_ROUTES.home);
        }}
      />
    </div>
  );
}
