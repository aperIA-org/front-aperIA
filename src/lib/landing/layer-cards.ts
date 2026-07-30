/**
 * Os 3 cards da seção "Do sinal à prova, em três camadas."
 *
 * Duas cores aqui não vêm do markup original, e sim do resultado do script de
 * "legibility repair" que rodava em runtime: os textos `--fg-dim` (#8a8e96)
 * eram reescritos para #3A2E2A, e o `border-top` de TODOS os cards para
 * rgba(58,46,42,.22) — inclusive o do card 03, que por isso perde a borda
 * vermelha que o markup declarava.
 */
export type LayerCard = {
  badge: string;
  badgeClassName: string;
  title: string;
  titleClassName: string;
  kicker: string;
  body: string;
  bodyClassName: string;
  /** Partes da linha de rodapé: `dim` usa a cor corrigida (#3A2E2A). */
  footer: { text: string; dim: boolean }[];
  footerClassName: string;
};

const BADGE_BASE =
  'flex h-[34px] w-[34px] items-center justify-center rounded-full font-mono text-xs font-semibold';

export const LAYER_CARDS: readonly LayerCard[] = [
  {
    badge: '01',
    badgeClassName: `${BADGE_BASE} border border-[#4a4f59] bg-[#0c0d10] text-white`,
    title: 'Coletar',
    titleClassName: 'text-ink',
    kicker: 'Toda a superfície, varrida.',
    body: 'Scanners varrem código e infra e ligam cada finding ao seu commit.',
    bodyClassName: 'text-ink-mute',
    footer: [
      { text: 'saída  ', dim: true },
      { text: '147 findings', dim: false },
      { text: ' · superfície 100%', dim: true },
    ],
    footerClassName: 'text-ink-meta',
  },
  {
    badge: '02',
    badgeClassName: `${BADGE_BASE} border border-[#8f2530] bg-[#0c0d10] text-[#FAFAFA]`,
    title: 'Correlacionar',
    titleClassName: 'text-ink',
    kicker: 'Evidências viram um caminho.',
    body: 'A I.A. de raciocínio conecta findings dispersos em um caminho de ataque.',
    bodyClassName: 'text-ink-strong',
    footer: [
      { text: 'saída  ', dim: true },
      { text: '3 caminhos', dim: false },
      { text: ' plausíveis', dim: true },
    ],
    footerClassName: 'text-ink-meta',
  },
  {
    badge: '03',
    badgeClassName: `${BADGE_BASE} border border-accent-bright bg-accent font-bold text-white`,
    title: 'Provar',
    titleClassName: 'text-accent-bright',
    kicker: 'O caminho, executado de verdade.',
    body: 'O adversário roda numa sandbox isolada. Se o caminho funciona, fica provado.',
    bodyClassName: 'text-ink-mute',
    footer: [
      { text: '“ATAQUE CONFIRMADO”', dim: false },
      { text: ' > “o CVE existe”', dim: true },
    ],
    footerClassName: 'font-semibold text-accent-bright',
  },
];
