import Link from 'next/link';

/**
 * Marcador de tela ainda não portada.
 *
 * O port do dashboard está em andamento: a fundação (dados, tipos, estado,
 * shell) e a tela Início já estão prontas, mas as telas de dados ainda não.
 * Este componente existe para que a navegação não dê 404 e para deixar
 * EXPLÍCITO o que falta — não é um estado vazio de produto.
 *
 * Ao portar uma tela, apague o uso deste componente.
 */
export function NotPortedYet({
  title,
  legacyLines,
  describes,
}: {
  title: string;
  /** Onde a tela vive em `legacy/dash/index.html`. */
  legacyLines: string;
  describes: string;
}) {
  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="text-[24px] font-bold">{title}</h1>
      </div>

      <div className="stat-card" style={{ maxWidth: 620 }}>
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-sm px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]"
          style={{ background: 'var(--accent-tint)', color: 'var(--text-primary)' }}
        >
          Não portada
        </div>
        <p className="mb-4 text-[13.5px] leading-[1.6] text-fg-mute">
          Esta tela ainda não foi migrada para React. {describes}
        </p>
        <p className="mono mb-5 text-[12px] text-fg-dim">
          Original: <code>legacy/dash/index.html</code> · {legacyLines}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dash" className="btn btn-sm btn-primary">
            Voltar para Início
          </Link>
          <span className="text-[12px] text-fg-dim">
            Para comparar: <code className="mono">python3 -m http.server 8000 --directory legacy</code>
          </span>
        </div>
      </div>
    </div>
  );
}
