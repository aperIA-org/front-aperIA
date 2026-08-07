/**
 * Os 14 nós do trilho do Attack Path.
 *
 * As posições são derivadas, não escritas à mão: o original distribuía os nós
 * linearmente de 3% a 90% (`T0 + i * (T1 - T0)/(N - 1)`, passo 87/13 ≈ 6.6923).
 * Calcular aqui garante que trilho, marcador e nós nunca saiam de sincronia.
 */
const T0 = 3;
const T1 = 90;
const N = 14;

export const AP_START_PCT = T0;
export const AP_SPAN_PCT = T1 - T0; // 87
export const AP_NODE_COUNT = N;

/** Posição (em %) do nó de índice 0..13. */
export function nodeTop(index: number): number {
  return T0 + index * (AP_SPAN_PCT / (N - 1));
}

export type TierNode = {
  kind: 'tier';
  label: string;
};

export type DiamondNode = {
  kind: 'diamond';
};

export type CardNode = {
  kind: 'card';
  title: string;
  scope: string;
  gain: string;
  /** Cor do valor em "Obtém:" — vem do original, por nó. */
  gainColor: string;
};

export type GoalNode = {
  kind: 'goal';
};

export type AttackPathNode = (TierNode | DiamondNode | CardNode | GoalNode) & {
  /** 1-based, como no original (`glow1`..`glow14`). */
  n: number;
  /** Posição vertical em %, sem unidade — vira a custom property `--top`. */
  top: number;
};

const SEQUENCE: (TierNode | DiamondNode | CardNode | GoalNode)[] = [
  { kind: 'tier', label: 'TRIAGEM' },
  {
    kind: 'card',
    title: 'Análise de Segredos',
    scope: 'Web-edge',
    gain: 'Credencial ATIVA verificada',
    gainColor: 'rgb(255, 45, 61)',
  },
  {
    kind: 'card',
    title: 'Análise Estática',
    scope: 'Arquivos alterados',
    gain: 'Padrão de código explorável',
    gainColor: 'rgb(197, 106, 99)',
  },
  { kind: 'diamond' },
  { kind: 'tier', label: 'ANÁLISE' },
  {
    kind: 'card',
    title: 'Composição e Dependências',
    scope: 'Repo inteiro',
    gain: 'Superfície vulnerável (CVE)',
    gainColor: 'rgb(255, 45, 61)',
  },
  {
    kind: 'card',
    title: 'Análise Estática Profunda',
    scope: 'Fluxo completo',
    gain: 'Fluxo de dados perigoso',
    gainColor: 'rgb(255, 45, 61)',
  },
  {
    kind: 'card',
    title: 'Postura de Nuvem',
    scope: 'Cloud · IAM',
    gain: 'Permissão excessiva',
    gainColor: 'rgb(201, 149, 66)',
  },
  { kind: 'diamond' },
  { kind: 'tier', label: 'EMULAÇÃO' },
  {
    kind: 'card',
    title: 'Análise Dinâmica',
    scope: 'Target_url',
    gain: 'Vetor de entrada confirmado',
    gainColor: 'rgb(197, 106, 99)',
  },
  {
    kind: 'card',
    title: 'Inteligência de Ameaças',
    scope: 'CVEs',
    gain: 'TTPs do adversário',
    gainColor: 'rgb(201, 149, 66)',
  },
  {
    kind: 'card',
    title: 'Emulação de Adversário',
    scope: 'Sandbox isolada',
    gain: 'Exploração provada (kill chain)',
    gainColor: 'rgb(255, 45, 61)',
  },
  { kind: 'goal' },
];

export const ATTACK_PATH_NODES: readonly AttackPathNode[] = SEQUENCE.map(
  (node, index) => ({ ...node, n: index + 1, top: nodeTop(index) }),
);

/** Legenda que acompanha o progresso — mesmos limiares do original. */
export function attackPathCaption(progress: number): string {
  if (progress < 0.03) return 'iniciando pipeline…';
  const markerPct = AP_START_PCT + progress * AP_SPAN_PCT;
  if (markerPct < 22) return 'triando · Tier 1…';
  if (markerPct < 56) return 'correlacionando · Tier 2…';
  if (markerPct < 88) return 'emulando adversário · Tier 3…';
  return 'kill chain confirmada · 8/8 etapas';
}
