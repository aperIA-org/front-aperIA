'use client';

import Link from 'next/link';
import { useDashState } from '@/lib/dash/dash-state';

/**
 * Portão das telas de dados.
 *
 * Antes do onboarding do GitHub não existe nada para mostrar em Findings,
 * Scans, Relatórios, Remediações e AI Emulation. No protótipo o `navigate()`
 * simplesmente recusava a troca de tela; com rotas reais a URL é acessível,
 * então a tela precisa explicar o que falta em vez de aparecer vazia.
 *
 * `mounted` evita piscar o aviso enquanto o estado ainda não foi lido do
 * localStorage.
 */
export function DataScreenGate({ children }: { children: React.ReactNode }) {
  const { connected, mounted } = useDashState();

  if (!mounted) return null;
  if (connected) return <>{children}</>;

  return (
    <div className="page-wrap">
      <div
        className="stat-card"
        style={{ maxWidth: 560, margin: '48px auto', textAlign: 'center' }}
      >
        <h1 className="mb-2 text-[18px] font-bold">Conecte-se com o GitHub</h1>
        <p className="mb-5 text-[13.5px] leading-[1.6] text-fg-mute">
          Esta tela depende dos scans. Conecte a organização e escolha os repositórios
          para o aperIA começar a analisar cada pull request.
        </p>
        <Link href="/dash" className="btn btn-md btn-primary">
          Ir para o onboarding
        </Link>
      </div>
    </div>
  );
}
