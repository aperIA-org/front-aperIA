'use client';

import { createContext, useContext, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renderiza o markdown que o pipeline gerou (`report_markdown`).
 *
 * HTML cru fica DESLIGADO de propósito, e é por isso que não existe
 * `dangerouslySetInnerHTML` aqui: o conteúdo vem de uma LLM e renderizar a
 * marcação dela seria vetor de XSS. O `urlTransform` padrão do react-markdown
 * já descarta esquemas como `javascript:` nos links.
 *
 * O estilo vem de overrides de componente, não de CSS global — as classes e as
 * custom properties do dash (`--text-*`, `--border-*`, `.dtbl`) resolvem os dois
 * temas sozinhas, sem nenhuma variante `light:`.
 */

/**
 * A v10 do react-markdown não passa mais `inline` para `code`, e um bloco de
 * código sem linguagem também não recebe `className`. O contexto é o que
 * distingue `` `código` `` de um bloco cercado: só o override de `pre` o liga.
 */
const InsidePre = createContext(false);

const HEADING = 'font-bold leading-[1.3] text-fg first:mt-0';
const BLOCK_TEXT = 'text-[13.5px] leading-[1.65] text-fg-mute';

function CodeSpan({ children }: { children?: ReactNode }) {
  if (useContext(InsidePre)) return <code>{children}</code>;

  return (
    <code
      className="mono rounded px-1 py-0.5 text-[12px] text-fg"
      style={{ background: 'var(--chip-bg)', border: '1px solid var(--border-default)' }}
    >
      {children}
    </code>
  );
}

const COMPONENTS: Components = {
  // Os títulos descem um nível: o `<h1>` da tela é o nome do repositório.
  h1: ({ children }) => <h2 className={`${HEADING} mb-2 mt-6 text-[17px]`}>{children}</h2>,
  h2: ({ children }) => <h3 className={`${HEADING} mb-2 mt-6 text-[15px]`}>{children}</h3>,
  h3: ({ children }) => <h4 className={`${HEADING} mb-1.5 mt-5 text-[13.5px]`}>{children}</h4>,
  h4: ({ children }) => <h5 className={`${HEADING} mb-1.5 mt-4 text-[13px]`}>{children}</h5>,
  h5: ({ children }) => <h6 className={`${HEADING} mb-1.5 mt-4 text-[12.5px]`}>{children}</h6>,
  h6: ({ children }) => (
    <h6 className={`${HEADING} mb-1.5 mt-4 text-[11.5px] uppercase tracking-[.06em]`}>
      {children}
    </h6>
  ),

  p: ({ children }) => <p className={`${BLOCK_TEXT} my-2.5 first:mt-0 last:mb-0`}>{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,

  ul: ({ children }) => (
    <ul className={`${BLOCK_TEXT} my-2.5 list-disc space-y-1 pl-5 marker:text-fg-dim`}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className={`${BLOCK_TEXT} my-2.5 list-decimal space-y-1 pl-5 marker:text-fg-dim`}>
      {children}
    </ol>
  ),
  // Item de checklist do GFM já vem com o `<input>`; o marcador da lista sobraria.
  li: ({ children, className }) => (
    <li className={className?.includes('task-list-item') ? 'list-none' : undefined}>
      {children}
    </li>
  ),

  a: ({ children, href }) => {
    const external = !!href && /^https?:/i.test(href);
    return (
      <a
        href={href}
        className="lnk-ext"
        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {children}
      </a>
    );
  },

  blockquote: ({ children }) => (
    <blockquote
      className="my-3 pl-3 text-[13px] italic text-fg-mute"
      style={{ borderLeft: '2px solid var(--divider)' }}
    >
      {children}
    </blockquote>
  ),

  hr: () => (
    <hr className="my-5" style={{ border: 0, borderTop: '1px solid var(--border-default)' }} />
  ),

  pre: ({ children }) => (
    <InsidePre.Provider value={true}>
      <pre
        className="mono my-3 overflow-x-auto rounded-md p-3 text-[11.5px] leading-[1.7] text-fg-mute"
        style={{ background: 'var(--bg-page)', border: '1px solid var(--border-default)' }}
      >
        {children}
      </pre>
    </InsidePre.Provider>
  ),
  code: CodeSpan,

  // Tabela larga rola dentro do próprio container — a página nunca rola na horizontal.
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table
        className="dtbl"
        style={{ tableLayout: 'auto', width: 'max-content', minWidth: '100%' }}
      >
        {children}
      </table>
    </div>
  ),
  // `.cl` alinha à esquerda (o padrão de `.dtbl` é centro); o `style` do GFM,
  // quando a coluna declara alinhamento, vence por ser inline.
  th: ({ children, style }) => (
    <th className="cl" style={style}>
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td className="cl" style={style}>
      {children}
    </td>
  ),
};

const REMARK_PLUGINS = [remarkGfm];

export function Markdown({ source }: { source: string }) {
  return (
    <div className="text-fg">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
