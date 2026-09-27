/** Os 3 checks verdes do mock de Pull Request. */
export const PR_CHECKS: readonly { name: string; result: string }[] = [
  {
    name: 'adversary-emulation / aperIA',
    result: ': Attack path confirmed (5/5 hops)',
  },
  { name: 'secret-scan / aperIA', result: ': secret remediado' },
  { name: 'risk-score / aperIA', result: ': 94/100 · prioridade alta' },
];
