'use client';

import type { CurrentUser } from '@/lib/api/user';
import { useDashState } from '@/lib/dash/dash-state';
import { DashSidebar } from './DashSidebar';
import { DashTopBar } from './DashTopBar';

const SIDEBAR_WIDTH = 256;
const SIDEBAR_WIDTH_COLLAPSED = 64;

/**
 * Casca do dashboard.
 *
 * Precisa ser client component porque a largura da coluna do grid depende de
 * `sidebarCollapsed`. No protótipo o `toggleSb()` escrevia
 * `shell.style.gridTemplateColumns` à mão; aqui as duas pontas (a coluna do
 * grid e a classe `.sb-c` da aside) saem do MESMO estado, então não há como
 * uma mudar sem a outra — era exatamente esse dessincronismo que deixava um
 * buraco de 192px ao recolher.
 */
export function DashShell({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useDashState();
  const width = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div
      data-app-shell
      id="app-shell"
      /* `text-fg`/`bg-surface-deep` reproduzem o que o <body> do protótipo
         declarava. Sem a cor base aqui, todo texto que não declara a própria
         cor herda o preto padrão do navegador — invisível no tema escuro. */
      className="bg-surface-deep text-fg"
      style={{
        display: 'grid',
        gridTemplateColumns: `${width}px 1fr`,
        minHeight: '100vh',
        transition: 'grid-template-columns .25s cubic-bezier(.22,.61,.36,1)',
      }}
    >
      <DashSidebar />

      <div
        className="flex flex-col"
        style={{
          height: '100vh',
          overflowY: 'scroll',
          scrollbarGutter: 'stable',
          background: 'var(--bg-page)',
        }}
      >
        <DashTopBar user={user} />
        <main id="app-main" className="flex-1" style={{ background: 'var(--bg-page)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
