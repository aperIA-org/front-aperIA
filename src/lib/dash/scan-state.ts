import type { ScanJob } from './types';

/**
 * O estado de uma execução, derivado dos três `tierN_status`.
 *
 * Vive aqui, e não dentro de uma tela, porque **as duas telas que mostram
 * execuções precisam concordar**: a lista de Scans e o detalhe do relatório. Ter
 * uma cópia em cada uma foi um bug real — ver `pipeStatus` abaixo.
 */
export type PipeStatus = 'blocked' | 'failed' | 'cancelled' | 'running' | 'done';

/**
 * Estados a partir dos quais um tier não muda mais.
 *
 * `cancelled` entra aqui por um motivo concreto: `pipeStatus` cai em `running`
 * quando não reconhece o estado do Tier 3, então um scan interrompido ficaria
 * "em execução" para sempre — com o polling batendo sem parar numa execução
 * que nunca mais vai mudar.
 */
const TIER_TERMINAL = ['done', 'failed', 'skipped', 'cancelled'];

/**
 * `blocked` | `failed` | `running` | `done`.
 *
 * **Nenhum tier `running` NÃO significa concluído.** Entre o fim do Tier 1 e o
 * início do Tier 2 existe uma janela em que `tier2_status` ainda é `null` — o
 * pipeline está andando, mas nada está marcado como `running`. O mesmo vale para
 * a execução recém-enfileirada, em que os três ainda são `null`.
 *
 * Tratar isso como "parado" tem três efeitos ruins, todos já observados:
 *
 * 1. O tier seguinte nunca aparece "em execução".
 * 2. O polling — que só roda enquanto há execução em andamento — desliga
 *    exatamente nessa janela; e como só um refresh traria o estado novo, ele
 *    nunca volta a ligar. A tela congela.
 * 3. No detalhe do relatório, a tela passa a AFIRMAR desfechos que não
 *    existem: "não calculado" no nível de risco, "sem veredito executivo" e o
 *    cabeçalho no ramo de concluído — sobre um scan que está no meio do caminho.
 *
 * O pipeline só terminou quando o Tier 3 alcançou um estado terminal.
 */
export function pipeStatus(job: ScanJob): PipeStatus {
  if (job.blocked_at_tier === 1 || job.final_risk_level === 'blocked') return 'blocked';
  /*
   * Cancelado antes de `failed` e de `running`: quando alguém interrompe, os
   * tiers pendentes viram `cancelled` de uma vez só, e o que já havia falhado
   * continua `failed`. A ordem aqui decide o que a tela ANUNCIA, e "falhou"
   * sobre um scan que a pessoa parou culparia o produto por uma decisão dela.
   */
  const cancelado = [job.tier1_status, job.tier2_status, job.tier3_status].includes(
    'cancelled',
  );
  if (cancelado) return 'cancelled';
  if (job.tier2_status === 'failed' || job.tier3_status === 'failed') return 'failed';
  if (
    job.tier1_status === 'running' ||
    job.tier2_status === 'running' ||
    job.tier3_status === 'running'
  ) {
    return 'running';
  }
  if (job.tier3_status && TIER_TERMINAL.includes(job.tier3_status)) return 'done';
  return 'running';
}

export function isJobRunning(job: ScanJob): boolean {
  return pipeStatus(job) === 'running';
}

/** Tier mais profundo que o scan realmente alcançou (pulado não conta). */
export function pipeTierReached(job: ScanJob): number {
  if (job.tier3_status && job.tier3_status !== 'skipped') return 3;
  if (job.tier2_status && job.tier2_status !== 'skipped') return 2;
  return 1;
}

/**
 * Nenhuma etapa chegou ao fim — o estado "scan recém-disparado".
 *
 * `failed` e `skipped` contam como "chegou ao fim": as duas são desfecho, e a
 * tela já tem o que dizer sobre elas. Só a execução em que os três tiers estão
 * na fila ou rodando é que não tem resultado nenhum para mostrar, e é a única
 * em que faz sentido descrever o pipeline em vez de exibi-lo.
 *
 * Vive fora dos componentes porque a decisão é da PÁGINA: é ela que escolhe
 * entre o card do pipeline previsto e o card dos caminhos de ataque.
 */
export function nadaConcluido(job: ScanJob): boolean {
  const tiers = [job.tier1_status, job.tier2_status, job.tier3_status];
  return !tiers.some(
    (status) =>
      status === 'done' ||
      status === 'failed' ||
      status === 'skipped' ||
      status === 'cancelled',
  );
}
