'use client';

import { useState, useTransition } from 'react';
import { disconnectGitHubAccount } from '@/lib/api/github-actions';
import { fmtAbs, timeAgo } from '@/lib/dash/format';
import {
  accountLabel,
  installationSettingsUrl,
  type GithubAccount,
  type Repository,
} from '@/lib/dash/github';
import { ConnectGitHubButton } from './ConnectGitHubButton';
import { DisconnectModal } from './DisconnectModal';
import { GitHubMark } from './GitHubMark';

/**
 * Contas GitHub (instalações do App) conectadas pelo usuário.
 *
 * A API modela N instalações por usuário — conta pessoal e organizações —, e
 * cada repositório ativado pertence a uma delas. Por isso a lista, e não um
 * único bloco "GitHub · org": com duas instalações não haveria como dizer qual
 * desconectar.
 */
export function GitHubAccountsCard({
  accounts,
  repositories,
  demo,
  resolved,
}: {
  accounts: readonly GithubAccount[];
  repositories: readonly Repository[];
  demo: boolean;
  /** `false` = a API não respondeu (ou não há sessão): estado neutro, não "sem conta". */
  resolved: boolean;
}) {
  const [confirming, setConfirming] = useState<GithubAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeCount = (accountId: string) =>
    repositories.filter((repo) => repo.github_account_id === accountId && repo.active).length;

  const confirmDisconnect = () => {
    const account = confirming;
    if (!account) return;
    setError(null);
    startTransition(async () => {
      const result = await disconnectGitHubAccount(account.id);
      setConfirming(null);
      if (!result.ok) setError(result.message);
    });
  };

  if (!resolved) {
    return (
      <div className="stat-card">
        <div className="flex items-start gap-3">
          <IconWarning />
          <div>
            <div className="text-[14px] font-semibold">Não foi possível verificar a conexão</div>
            <p className="mt-1 max-w-[62ch] text-[12.5px] leading-[1.6] text-fg-mute">
              O aperIA não conseguiu falar com a API para saber quais contas do GitHub estão
              conectadas. Recarregue a página; se persistir, verifique se sua sessão ainda é
              válida.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="stat-card flex flex-wrap items-center gap-4">
        <div
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg"
          style={{ background: 'var(--bg-surface-raised)' }}
        >
          <GitHubMark fill="#a1a1a1" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-semibold">GitHub</span>
            <span className="sev st-skipped">Não conectado</span>
          </div>
          <div className="mt-1 text-[12.5px] text-fg-dim">
            Instale o GitHub App para o aperIA enxergar seus repositórios e analisar cada pull
            request.
          </div>
        </div>
        <ConnectGitHubButton size="sm" />
      </div>
    );
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-2 text-[12.5px] leading-[1.5]"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            color: '#ef4444',
            background: 'rgba(239,68,68,.08)',
            border: '1px solid rgba(239,68,68,.22)',
          }}
        >
          {error}
        </div>
      )}

      {accounts.map((account) => {
        const monitored = activeCount(account.id);
        return (
          <div key={account.id} className="stat-card mb-2 flex flex-wrap items-center gap-4">
            <div
              className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg"
              style={{ background: 'var(--bg-surface-raised)' }}
            >
              <GitHubMark fill="#f2f2f2" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="truncate text-[15px] font-semibold">
                  GitHub · {accountLabel(account)}
                </span>
                <span className="sev st-done">Connected</span>
                {account.account_type && (
                  <span
                    className="mono rounded-xs border px-1.5 py-0.5 text-[9px] uppercase"
                    style={{
                      color: 'var(--text-dim)',
                      borderColor: 'var(--gauge-track)',
                      background: 'var(--bg-surface-raised)',
                    }}
                  >
                    {account.account_type === 'Organization' ? 'Organização' : 'Pessoal'}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[12.5px] text-fg-dim">
                <span title={fmtAbs(account.created_at)} className="cursor-help">
                  Instalado {timeAgo(account.created_at)}
                </span>{' '}
                ·{' '}
                {monitored === 1
                  ? '1 repositório monitorado'
                  : `${monitored} repositórios monitorados`}
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-3">
              {/* Quando a instalação não expõe um repositório, o conserto é no
                  GitHub — a API não devolve esta URL, ela é montada no cliente. */}
              {!demo && (
                <a
                  href={installationSettingsUrl(account)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="lnk-ext text-[12.5px]"
                >
                  Gerenciar acesso no GitHub
                </a>
              )}
              <button
                type="button"
                onClick={() => setConfirming(account)}
                disabled={pending}
                className="cursor-pointer border-none bg-transparent p-1.5 text-[12.5px] text-fg-dim underline"
              >
                Desconectar
              </button>
            </div>
          </div>
        );
      })}

      {!demo && (
        <div className="mt-3">
          <ConnectGitHubButton size="sm" label="Conectar outra conta ou organização" />
        </div>
      )}

      <DisconnectModal
        open={confirming !== null}
        accountLabel={confirming ? accountLabel(confirming) : ''}
        repoCount={confirming ? activeCount(confirming.id) : 0}
        pending={pending}
        onCancel={() => setConfirming(null)}
        onConfirm={confirmDisconnect}
      />
    </>
  );
}

function IconWarning() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#eab308"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 flex-shrink-0"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
