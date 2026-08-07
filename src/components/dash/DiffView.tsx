import { Fragment } from 'react';

function FileIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
      <path d="M13 2v7h7" />
    </svg>
  );
}

/**
 * Patch em formato diff, no visual do GitHub: cabeçalho com o arquivo e a
 * contagem de linhas, corpo com `-`/`+` coloridos por `.diff-rem`/`.diff-add`.
 *
 * O patch vem com quebras de linha reais, então cada linha é um `<span>` e o
 * `\n` fica FORA dele — dentro, o fundo do realce se estenderia pela quebra.
 */
export function DiffView({
  patch,
  filePath,
}: {
  patch: string;
  filePath?: string | null;
}) {
  const lines = patch.split('\n');
  const added = lines.filter((l) => l.startsWith('+')).length;
  const removed = lines.filter((l) => l.startsWith('-')).length;

  return (
    <div>
      <div
        className="flex items-center justify-between rounded-t-md border border-line px-2.5 py-1.5"
        style={{ background: 'var(--bg-page)', borderBottom: 'none' }}
      >
        <span className="mono inline-flex items-center gap-1.5 overflow-hidden text-[11px] text-fg-mute">
          <FileIcon />
          <span className="truncate">{filePath || 'patch'}</span>
        </span>
        <span className="mono ml-2.5 flex-shrink-0 text-[11px]">
          <span style={{ color: 'var(--sev-safe)' }}>+{added}</span>{' '}
          <span style={{ color: 'var(--sev-critical)' }}>−{removed}</span>
        </span>
      </div>

      <pre
        className="m-0 overflow-x-auto rounded-b-md border border-line p-3 text-[11.5px] leading-[1.7]"
        style={{ background: 'var(--bg-page)' }}
      >
        {lines.map((line, i) => {
          const cls = line.startsWith('+')
            ? 'diff-add'
            : line.startsWith('-')
              ? 'diff-rem'
              : undefined;

          return (
            <Fragment key={`${i}-${line}`}>
              <span className={cls} style={cls ? undefined : { color: 'var(--text-dim)' }}>
                {line}
              </span>
              {i < lines.length - 1 ? '\n' : null}
            </Fragment>
          );
        })}
      </pre>
    </div>
  );
}
