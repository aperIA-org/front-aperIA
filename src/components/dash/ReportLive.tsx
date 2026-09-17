'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Enquanto o scan roda, a tela se atualiza sozinha.
 *
 * `router.refresh()` reexecuta os server components e traz o estado novo — é o
 * mesmo mecanismo da lista de Scans (`ScansScreen`), e é o que faz a tela andar
 * de "tudo na fila" para "Tier 3 rodando" e daí para o relatório pronto sem
 * ninguém recarregar. Um scan leva de 3 a 60 minutos: sem isso, quem abre a
 * página durante a execução vê um retrato congelado.
 *
 * Não guarda nada em estado local de propósito. A lista de execuções e o
 * relatório são do servidor; uma cópia no cliente divergiria dele em vez de
 * antecipá-lo.
 */

/** 5s: o mesmo intervalo da lista de Scans, pelas mesmas razões. */
const INTERVALO_MS = 5000;

export function ReportLive({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => router.refresh(), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [active, router]);

  return null;
}
