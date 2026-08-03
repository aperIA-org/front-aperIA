'use client';

import Link from 'next/link';
import { useDashState } from '@/lib/dash/dash-state';

/**
 * Portão das telas de dados.
 *
 * Antes de conectar o GitHub não existe nada para mostrar em Findings, Scans,
 * Relatórios, Remediações e AI Emulation. No protótipo o `navigate()` simplesmente
 * recusava a troca de tela; com rotas reais a URL é acessível, então a tela
 * precisa explicar o que falta em vez de aparecer vazia.
 *
 * Não há mais guard de `mounted`: a conexão é resolvida no servidor, então o
 * aviso já vem no HTML do SSR em vez de aparecer depois do primeiro efeito.
 *
 * **Só o estado RESOLVIDO manda o usuário ao onboarding.** Quando a conexão não
 * resolveu (`resolved: false` — API não respondeu ou sessão indisponível naquele
 * render, comum sob carga do scan), não sabemos se há contas: mostrar "Conecte-se
 * com o GitHub" seria mentir sobre uma queda transitória. Nesse caso renderiza-se
 * o conteúdo (que se recompõe no próximo `router.refresh()`), em vez de expulsar
 * quem está de fato conectado. O onboarding fica reservado ao caso genuíno:
 * resolveu e não há nenhuma conta.
 */
export function DataScreenGate({ children }: { children: React.ReactNode }) {
  const { connected, resolved } = useDashState();

  if (connected || !resolved) return <>{children}</>;

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
