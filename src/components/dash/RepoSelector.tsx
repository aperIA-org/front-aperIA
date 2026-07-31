'use client';

import { useMemo, useState, useTransition } from 'react';
import { saveMonitoredRepos } from '@/lib/api/github-actions';
import { timeAgo } from '@/lib/dash/format';
import {
  groupReposByOwner,
  repoShortName,
  type AvailableRepo,
} from '@/lib/dash/github';
import { IconSearch } from './DashIcons';

function IconRepo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#a1a1a1"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="flex-shrink-0"
    >
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="6" cy="18" r="2.3" />
      <circle cx="18" cy="8" r="2.3" />
      <path d="M6 8.3v7.4M18 10.3c0 4-6 3-12 5" />
    </svg>
  );
}

function IconLock({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </svg>
  );
}

/**
 * Seleção dos repositórios que o aperIA monitora.
 *
 * A lista vem ao vivo de `GET /github/repos` (o que a instalação enxerga) e o
 * que já está ativado chega marcado com `active`. A identidade é o
 * `github_repo_id` — único campo presente tanto ali quanto em `/repositories`,
 * e por isso a chave do rascunho.
 *
 * O rascunho é estado local; só sobe para a API quando o usuário confirma. O
 * diff (o que ativar, o que desativar) é recalculado no servidor pela Server
 * Action, então nada que este componente mande é usado como verdade.
 */
export function RepoSelector({
  available,
  submitLabel,
  demo = false,
  onSaved,
}: {
  available: readonly AvailableRepo[];
  submitLabel: string;
  /** Modo demonstração: a seleção não é persistida em lugar nenhum. */
  demo?: boolean;
  /** Chamado depois de um salvamento bem sucedido (o onboarding avança). */
  onSaved?: () => void;
}) {
  const [draft, setDraft] = useState<Set<number>>(
    () => new Set(available.filter((repo) => repo.active).map((repo) => repo.github_repo_id)),
  );
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? available.filter((repo) => repo.full_name.toLowerCase().includes(q)) : available;
  }, [available, query]);

  const groups = useMemo(() => groupReposByOwner(visible), [visible]);

  const toggle = (githubRepoId: number) =>
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(githubRepoId)) next.delete(githubRepoId);
      else next.add(githubRepoId);
      return next;
    });

  const disabled = draft.size === 0 || pending;

  const submit = () => {
    if (draft.size === 0) return;

    if (demo) {
      setFeedback({
        ok: true,
        message: 'Modo demonstração: a seleção não é enviada ao back-end.',
      });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await saveMonitoredRepos([...draft]);
      setFeedback({ ok: result.ok, message: result.message ?? 'Seleção salva.' });
      if (result.ok) onSaved?.();
    });
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div
        className="flex flex-wrap items-center gap-2.5"
        style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="relative min-w-[180px] flex-1">
          <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-fg-dim">
            <IconSearch />
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar repositório…"
            aria-label="Buscar repositório"
            className="inp w-full"
            style={{ paddingLeft: 32, height: 34 }}
          />
        </div>
        <button
          type="button"
          className="chip chip-clear"
          onClick={() => setDraft(new Set(available.map((repo) => repo.github_repo_id)))}
        >
          Selecionar todos
        </button>
        <button type="button" className="chip chip-clear" onClick={() => setDraft(new Set())}>
          Limpar
        </button>
      </div>

      <div style={{ maxHeight: 420, overflowY: 'auto', padding: 6 }}>
        {visible.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-fg-dim">
            {available.length === 0
              ? 'A instalação do GitHub App não expõe nenhum repositório.'
              : 'Nenhum repositório corresponde à busca.'}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.owner}>
              {/* O cabeçalho de dono só faz sentido com mais de uma instalação. */}
              {groups.length > 1 && (
                <div
                  className="mono px-3.5 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-fg-dim"
                >
                  {group.owner}
                </div>
              )}
              {group.repos.map((repo) => {
                const on = draft.has(repo.github_repo_id);
                return (
                  <button
                    key={repo.github_repo_id}
                    type="button"
                    data-repo={repo.full_name}
                    onClick={() => toggle(repo.github_repo_id)}
                    aria-pressed={on}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-transparent bg-transparent text-left transition-colors hover:bg-surface-hover"
                    style={{ padding: '11px 14px' }}
                  >
                    <span className="flex min-w-0 items-center gap-[11px]">
                      <IconRepo />
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium text-fg">
                          {groups.length > 1 ? repoShortName(repo.full_name) : repo.full_name}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-dim">
                          <span className="inline-flex items-center gap-[3px]">
                            <IconLock />
                            {repo.private ? 'Privado' : 'Público'}
                          </span>
                          {repo.language && (
                            <>
                              <span>·</span>
                              <span>{repo.language}</span>
                            </>
                          )}
                          {repo.pushed_at && (
                            <>
                              <span>·</span>
                              <span>push {timeAgo(repo.pushed_at)}</span>
                            </>
                          )}
                        </span>
                      </span>
                    </span>
                    <span
                      className="relative flex-shrink-0"
                      style={{
                        width: 36,
                        height: 20,
                        borderRadius: 100,
                        background: on ? '#c22f3d' : 'var(--divider)',
                        transition: 'background .15s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: on ? 18 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left .15s',
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {feedback && (
        <div
          className="text-[12.5px] leading-[1.5]"
          role={feedback.ok ? 'status' : 'alert'}
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border-default)',
            color: feedback.ok ? '#22c55e' : '#ef4444',
          }}
        >
          {feedback.message}
        </div>
      )}

      <div
        className="flex flex-wrap items-center justify-between gap-3"
        style={{ padding: '14px 16px', borderTop: '1px solid var(--border-default)' }}
      >
        <span className="text-[13px] text-fg-mute">
          {draft.size} de {available.length}{' '}
          {available.length === 1 ? 'repositório selecionado' : 'repositórios selecionados'}
        </span>
        <button
          type="button"
          className="btn btn-md btn-primary"
          disabled={disabled}
          title={draft.size === 0 ? 'Selecione ao menos um repositório' : undefined}
          style={disabled ? { opacity: 0.45, cursor: pending ? 'wait' : 'not-allowed' } : undefined}
          onClick={submit}
        >
          {pending ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
