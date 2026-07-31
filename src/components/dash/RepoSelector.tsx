'use client';

import { useMemo, useState } from 'react';
import { timeAgo } from '@/lib/dash/format';
import { GH_ORG, INSTALLATION_REPOS } from '@/lib/dash/mock-data';
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
 * Seletor de repositórios — usado no passo 2 do onboarding e na tela de
 * gerenciamento. O rascunho (`draft`) é estado local: só sobe para o estado
 * global quando o usuário confirma.
 */
export function RepoSelector({
  initialSelection,
  submitLabel,
  onSubmit,
}: {
  initialSelection: string[];
  submitLabel: string;
  onSubmit: (repos: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(initialSelection);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? INSTALLATION_REPOS.filter((r) => r.name.toLowerCase().includes(q)) : INSTALLATION_REPOS;
  }, [query]);

  const toggle = (name: string) =>
    setDraft((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  const disabled = draft.length === 0;

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
        className="flex items-center gap-2.5"
        style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="relative flex-1">
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
          onClick={() => setDraft(INSTALLATION_REPOS.map((r) => r.name))}
        >
          Selecionar todos
        </button>
        <button type="button" className="chip chip-clear" onClick={() => setDraft([])}>
          Limpar
        </button>
      </div>

      <div style={{ maxHeight: 420, overflowY: 'auto', padding: 6 }}>
        {visible.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-fg-dim">
            Nenhum repositório corresponde à busca.
          </div>
        ) : (
          visible.map((repo) => {
            const on = draft.includes(repo.name);
            return (
              <button
                key={repo.name}
                type="button"
                data-repo={repo.name}
                onClick={() => toggle(repo.name)}
                aria-pressed={on}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-transparent bg-transparent text-left transition-colors hover:bg-surface-hover"
                style={{ padding: '11px 14px' }}
              >
                <span className="flex min-w-0 items-center gap-[11px]">
                  <IconRepo />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-fg">
                      {GH_ORG}/{repo.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-dim">
                      <span className="inline-flex items-center gap-[3px]">
                        <IconLock />
                        {repo.private ? 'Privado' : 'Público'}
                      </span>
                      <span>·</span>
                      <span>{repo.lang}</span>
                      <span>·</span>
                      <span>push {timeAgo(repo.last_push)}</span>
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
          })
        )}
      </div>

      <div
        className="flex items-center justify-between gap-3"
        style={{ padding: '14px 16px', borderTop: '1px solid var(--border-default)' }}
      >
        <span className="text-[13px] text-fg-mute">
          {draft.length} de {INSTALLATION_REPOS.length} repositórios selecionados
        </span>
        <button
          type="button"
          className="btn btn-md btn-primary"
          disabled={disabled}
          title={disabled ? 'Selecione ao menos um repositório' : undefined}
          style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
          onClick={() => !disabled && onSubmit(draft)}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
