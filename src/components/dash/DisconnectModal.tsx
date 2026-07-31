'use client';

import { useEffect, useRef } from 'react';
import { GH_ORG } from '@/lib/dash/mock-data';

/**
 * Confirmação de desconexão do GitHub.
 *
 * O original injetava um overlay no DOM e fechava por `closeModal()` global.
 * Aqui é um componente controlado, com trava de scroll, Escape e foco inicial
 * no botão de cancelar — nenhum dos três existia no protótipo.
 */
export function DisconnectModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Desconectar GitHub"
      onClick={onCancel}
      className="fixed inset-0 z-[200] flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,.5)' }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[440px] overflow-hidden rounded-[10px]"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--divider)',
          boxShadow: '0 8px 24px rgba(0,0,0,.5)',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--divider)' }}>
          <h2 className="text-[15px] font-semibold text-fg">Desconectar GitHub</h2>
        </div>

        <div style={{ padding: '18px 20px' }}>
          <p className="text-[13.5px] leading-[1.6] text-fg-mute">
            O aperIA vai parar de escanear os repositórios de{' '}
            <span className="font-semibold text-fg">{GH_ORG}</span>. Os findings já
            coletados continuam disponíveis, mas nenhum pull request novo será
            analisado até você reconectar.
          </p>
        </div>

        <div
          className="flex items-center justify-end gap-2.5"
          style={{ padding: '14px 20px', borderTop: '1px solid var(--divider)' }}
        >
          <button type="button" ref={cancelRef} className="btn btn-sm btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={onConfirm}>
            Desconectar
          </button>
        </div>
      </div>
    </div>
  );
}
