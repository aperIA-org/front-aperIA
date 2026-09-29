'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cancelScan } from '@/lib/api/github-actions';

/**
 * Interrompe a execução em andamento.
 *
 * Confirmação em dois cliques, no próprio botão, em vez de modal ou
 * `window.confirm`: um scan leva de 3 a 60 minutos, então o clique errado
 * custa caro — mas um diálogo para uma ação só é cerimônia, e `confirm()`
 * bloqueia a aba.
 *
 * A confirmação se desarma sozinha em 4 segundos. Sem isso, o botão ficaria
 * "armado" indefinidamente e o segundo clique viria de outra intenção.
 */
export function CancelarScan({ scanId }: { scanId: string }) {
  const [armado, setArmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const router = useRouter();

  function clicar() {
    setErro(null);

    if (!armado) {
      setArmado(true);
      window.setTimeout(() => setArmado(false), 4000);
      return;
    }

    setArmado(false);
    startTransition(async () => {
      const r = await cancelScan(scanId);
      if (!r.ok) {
        setErro(r.message);
        return;
      }
      // `revalidatePath` na action invalida o cache do servidor; o refresh é o
      // que faz esta tela buscar de novo sem recarregar a página inteira.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={clicar}
        disabled={pendente}
        className={`btn btn-sm ${armado ? 'btn-primary' : 'btn-ghost'}`}
        title="Interrompe as etapas que ainda não terminaram"
      >
        {pendente ? 'Cancelando…' : armado ? 'Confirmar cancelamento' : 'Cancelar scan'}
      </button>
      {armado && !erro && (
        <span className="text-[11.5px]" style={{ color: 'var(--text-dim)' }}>
          Os achados já encontrados permanecem
        </span>
      )}
      {erro && (
        <span role="alert" className="max-w-[260px] text-right text-[11.5px]"
          style={{ color: 'var(--sev-high)' }}>
          {erro}
        </span>
      )}
    </div>
  );
}
