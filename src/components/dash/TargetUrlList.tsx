'use client';

import { useState, useTransition } from 'react';
import { setRepositoryTargetUrl } from '@/lib/api/github-actions';
import type { Repository } from '@/lib/dash/github';

/**
 * Alvo de DAST por repositório — a URL da aplicação publicada.
 *
 * É o que destrava o teste dinâmico no Tier 3: sem ela o tier registra
 * `reason="no_target_url"` e o DAST não roda. Fica separado do seletor de
 * repositórios de propósito — lá as linhas são botões de liga/desliga, e um
 * `<input>` dentro de um `<button>` é HTML inválido.
 *
 * Só aparece para repositórios monitorados: alvo em repositório desativado não
 * seria usado por scan nenhum.
 */
function RepoTargetRow({ repo, demo }: { repo: Repository; demo: boolean }) {
  const [valor, setValor] = useState(repo.target_url ?? '');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const original = repo.target_url ?? '';
  const alterado = valor.trim() !== original;

  const salvar = () => {
    if (demo) {
      setFeedback({
        ok: true,
        message: 'Modo demonstração: o alvo não é enviado ao back-end.',
      });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      // Campo vazio significa remover — a API distingue pela chave `null`.
      const alvo = valor.trim() === '' ? null : valor.trim();
      const result = await setRepositoryTargetUrl(repo.id, alvo);
      setFeedback({ ok: result.ok, message: result.message ?? 'Salvo.' });
    });
  };

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-[180px] flex-1 truncate text-[13.5px] font-medium text-fg">
          {repo.full_name}
        </span>
        <input
          type="url"
          inputMode="url"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && alterado && !pending) salvar();
          }}
          placeholder="https://staging.suaempresa.com"
          aria-label={`URL da aplicação de ${repo.full_name}`}
          className="inp min-w-[220px] flex-[2]"
          style={{ height: 34 }}
        />
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={!alterado || pending}
          style={!alterado || pending ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
          onClick={salvar}
        >
          {pending ? 'Salvando…' : valor.trim() === '' && original ? 'Remover' : 'Salvar'}
        </button>
      </div>

      {feedback && (
        <p
          role={feedback.ok ? 'status' : 'alert'}
          className="mt-2 text-[12.5px] leading-[1.5]"
          style={{ color: feedback.ok ? '#22c55e' : '#ef4444' }}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}

export function TargetUrlList({
  repositories,
  demo,
}: {
  repositories: readonly Repository[];
  demo: boolean;
}) {
  const monitorados = repositories.filter((repo) => repo.active);

  if (monitorados.length === 0) return null;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
        <p className="max-w-[74ch] text-[12.5px] leading-[1.6] text-fg-mute">
          Onde cada repositório está publicado. O Tier 3 usa esse endereço para o scan
          dinâmico (DAST); sem ele, o DAST é pulado e a análise profunda roda só sobre o
          código. Deixe em branco para remover. Só endereços públicos são aceitos —
          apontar para a rede interna seria usar o aperIA contra a própria infraestrutura.
        </p>
      </div>
      {monitorados.map((repo) => (
        <RepoTargetRow key={repo.id} repo={repo} demo={demo} />
      ))}
    </div>
  );
}
