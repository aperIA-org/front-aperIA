/**
 * Os 8 tiles do marquee "COBERTURA DO CÓDIGO À NUVEM, EM TODAS AS CAMADAS".
 *
 * **Os tiles não nomeiam as ferramentas.** O original trazia os logos dos
 * scanners do pipeline (Semgrep, Trivy, ZAP, Caldera) e dois tiles de texto
 * (PROWLER, TruffleHog); a plataforma deixou de expor qual produto roda em cada
 * etapa — ver o cabeçalho de `src/lib/dash/pipeline-tools.ts` —, então cada tile
 * passou a nomear a CAPACIDADE, na mesma linguagem do dashboard. Os PNGs
 * continuam em `public/assets/` porque o site antigo em `legacy/` os referencia.
 *
 * MITRE ATT&CK fica: é a taxonomia pública que o produto cita nos relatórios
 * (as técnicas `Txxxx` aparecem na cadeia de ataque), não uma ferramenta do
 * pipeline.
 *
 * `width`/`height` são as dimensões intrínsecas do arquivo (o next/image exige
 * as duas). O tamanho final vem de `fitClassName`, que reproduz os limites
 * `max-height`/`max-width` do original: com `w-auto h-auto` o browser reduz a
 * imagem preservando a proporção até caber na caixa, igual ao `<img>` original,
 * que não declarava width/height.
 */
export type EcosystemTile =
  | {
      kind: 'image';
      /** Vira o `alt` na primeira cópia da trilha; a segunda vai com `alt=""`. */
      name: string;
      src: string;
      width: number;
      height: number;
      fitClassName: string;
    }
  | {
      kind: 'text';
      name: string;
      textClassName: string;
    };

/**
 * Os tiles de capacidade têm duas linhas de propósito: a caixa tem 180px e
 * "Dependências e containers" não cabe em uma só no corpo da heading.
 */
const CAPABILITY_CLASS =
  'block px-4 text-center font-heading text-[14.5px] font-bold leading-[1.28] tracking-[-0.005em] text-[#17191d]';

export const ECOSYSTEM_TILES: readonly EcosystemTile[] = [
  { kind: 'text', name: 'Credenciais expostas', textClassName: CAPABILITY_CLASS },
  { kind: 'text', name: 'Análise estática de código', textClassName: CAPABILITY_CLASS },
  { kind: 'text', name: 'Dependências e containers', textClassName: CAPABILITY_CLASS },
  { kind: 'text', name: 'Postura de nuvem', textClassName: CAPABILITY_CLASS },
  { kind: 'text', name: 'Teste dinâmico da aplicação', textClassName: CAPABILITY_CLASS },
  { kind: 'text', name: 'Inteligência de ameaças', textClassName: CAPABILITY_CLASS },
  { kind: 'text', name: 'Emulação de adversário', textClassName: CAPABILITY_CLASS },
  {
    kind: 'image',
    name: 'MITRE ATT&CK',
    src: '/assets/logo-mitre-attack.png',
    width: 500,
    height: 300,
    fitClassName: 'max-h-[46px] max-w-[128px]',
  },
];
