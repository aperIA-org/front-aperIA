'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  DASH_SCREENS,
  PREVIEW_NAVIGATE_MESSAGE,
  SCREEN_ROUTES,
  type DashScreen,
} from '@/lib/dash/dash-routes';
import { useDashState } from '@/lib/dash/dash-state';

/**
 * Ponte de navegação do preview embutido no /cadastro.
 *
 * O carrossel da tela de cadastro roda o dashboard dentro de um iframe e
 * precisa trocar de tela. No site estático ele alcançava o DOM do iframe e
 * clicava em `.sb-item[data-screen="..."]`; aqui a comunicação é por
 * postMessage e a navegação é `router.push`, então o iframe não recarrega.
 *
 * A origem é validada: só aceita mensagens da própria origem.
 */
export function PreviewNavigationBridge() {
  const router = useRouter();
  const { isPreview } = useDashState();

  useEffect(() => {
    if (!isPreview) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const data = event.data as { type?: unknown; screen?: unknown } | null;
      if (!data || data.type !== PREVIEW_NAVIGATE_MESSAGE) return;
      if (typeof data.screen !== 'string') return;
      if (!DASH_SCREENS.includes(data.screen as DashScreen)) return;

      const route = SCREEN_ROUTES[data.screen as DashScreen];
      router.push(`${route}?preview=1&theme=light`);
      window.scrollTo(0, 0);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isPreview, router]);

  return null;
}
