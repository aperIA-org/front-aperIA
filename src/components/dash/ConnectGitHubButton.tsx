'use client';

import { useState, useTransition } from 'react';
import { startGitHubConnect } from '@/lib/api/github-actions';
import { GitHubMark } from './GitHubMark';

/**
 * Inicia a instalação do GitHub App.
 *
 * A Server Action pede a `install_url` à API e redireciona o browser para o
 * GitHub — não há mais navegação simulada: a partir daqui o usuário sai do site
 * e volta pelo callback. O `state` assinado embutido nessa URL expira em 10
 * minutos, por isso ela é pedida no clique e nunca no render.
 *
 * A mensagem de erro é a única saída visível quando o GitHub App não está
 * configurado no ambiente (a API responde 503).
 */
export function ConnectGitHubButton({
  label = 'Conectar GitHub',
  size = 'md',
}: {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const connect = () => {
    setError(null);
    startTransition(async () => {
      const result = await startGitHubConnect();
      // Sucesso não retorna: a ação redireciona para o github.com.
      if (!result.ok) setError(result.message);
    });
  };

  const large = size === 'lg';
  const sizeClass = size === 'sm' ? ' btn-sm' : size === 'md' ? ' btn-md' : '';

  return (
    <div>
      <button
        type="button"
        className={`btn btn-primary${sizeClass}`}
        onClick={connect}
        disabled={pending}
        style={{
          gap: large ? 9 : 7,
          ...(large ? { height: 46, padding: '0 22px', fontSize: 15 } : {}),
          ...(pending ? { opacity: 0.7, cursor: 'wait' } : {}),
        }}
      >
        {pending ? (
          <>
            <svg
              className="spin"
              width={large ? 15 : 13}
              height={large ? 15 : 13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 11-9-9" />
            </svg>
            Redirecionando ao GitHub…
          </>
        ) : (
          <>
            <GitHubMark size={large ? 25 : 13} />
            {label}
          </>
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-2.5 max-w-[46ch] text-[12.5px] leading-[1.5]"
          style={{ color: '#ef4444' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
