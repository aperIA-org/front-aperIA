import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DashSidebar } from '@/components/dash/DashSidebar';
import { DashTopBar } from '@/components/dash/DashTopBar';
import { PreviewNavigationBridge } from '@/components/dash/PreviewNavigationBridge';
import { getCurrentUser } from '@/lib/api/user';
import { DashStateProvider } from '@/lib/dash/dash-state';
import './dash.css';

export const metadata: Metadata = {
  title: 'aperIA · Dashboard',
  description: 'Postura de segurança, findings validados e emulação de adversário.',
};

/**
 * Aplica o tema ANTES da primeira pintura, evitando o flash de tema errado.
 * O `DashStateProvider` também mantém o atributo em sincronia depois de montar,
 * mas isso já é tarde para o primeiro paint.
 *
 * Escuro é a baseline: o atributo só é setado quando o tema é claro.
 */
const THEME_SCRIPT = `
(function(){try{
  var p=new URLSearchParams(location.search).get('theme');
  var t=p||localStorage.getItem('aperia-theme');
  if(!t)t=(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';
  if(t==='light')document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
}catch(e){}})();
`;

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  // Resolvido no servidor: o access token é um cookie httpOnly, então o
  // browser não conseguiria fazer esta busca nem se quisesse.
  const user = await getCurrentUser();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

      {/* useSearchParams (preview/theme) exige Suspense no App Router. */}
      <Suspense fallback={null}>
        <DashStateProvider>
          <PreviewNavigationBridge />

          <div
            data-app-shell
            id="app-shell"
            style={{
              display: 'grid',
              gridTemplateColumns: '256px 1fr',
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
        </DashStateProvider>
      </Suspense>
    </>
  );
}
