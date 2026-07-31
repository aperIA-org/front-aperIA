'use client';

import { useEffect, useRef } from 'react';
import { GH_ORG, INSTALLATION_REPOS } from '@/lib/dash/mock-data';

/** Spinner de 1 traço — o mesmo usado nos badges `st-running`. */
export function Spinner({ size = 9 }: { size?: number }) {
  return (
    <svg
      className="spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 11-9-9" />
    </svg>
  );
}

export function IconPlay({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 3l14 9-14 9V3z" />
    </svg>
  );
}

/**
 * Modal do botão principal "Iniciar scan": escolha o repositório e rode.
 *
 * O protótipo injetava um overlay no `document.body` e fechava por um
 * `closeModal()` global. Aqui é controlado por props e ganha o que faltava —
 * trava de scroll, Escape e foco inicial —, no mesmo padrão do
 * `DisconnectModal`.
 */
export function ScanModal({
  open,
  isRunning,
  onClose,
  onStart,
}: {
  open: boolean;
  /** Um scan já em execução no repositório desabilita a linha. */
  isRunning: (repoName: string) => boolean;
  onClose: () => void;
  onStart: (repoName: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Iniciar scan"
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,.55)' }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[480px] overflow-hidden rounded-xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--divider)',
          boxShadow: '0 8px 24px rgba(0,0,0,.35)',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-default)' }}
        >
          <div>
            <h3 className="text-[16px] font-bold text-fg">Iniciar scan</h3>
            <p className="mt-[3px] text-[12.5px] text-fg-mute">
              Escolha o repositório para escanear agora.
            </p>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="Fechar"
            className="cursor-pointer border-none bg-transparent text-[20px] leading-none text-fg-dim"
            style={{ padding: '4px 8px' }}
          >
            ×
          </button>
        </div>

        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {INSTALLATION_REPOS.map((repo) => {
            const running = isRunning(repo.name);
            return (
              <button
                key={repo.name}
                type="button"
                disabled={running}
                onClick={() => onStart(repo.name)}
                className="flex w-full items-center justify-between gap-3 border-none bg-transparent text-left enabled:cursor-pointer enabled:hover:bg-surface-hover disabled:cursor-default disabled:opacity-[.55]"
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border-default)',
                }}
              >
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-fg">
                    {GH_ORG}/{repo.name}
                  </span>
                  <span className="text-[11px] text-fg-dim">
                    {repo.lang} · {repo.private ? 'privado' : 'público'}
                  </span>
                </span>

                {running ? (
                  <span className="sev st-running flex-shrink-0">em execução</span>
                ) : (
                  <span
                    className="inline-flex flex-shrink-0 items-center gap-1.5 text-[12px] font-semibold"
                    style={{ color: '#d81f2a' }}
                  >
                    <IconPlay size={11} />
                    Iniciar
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
