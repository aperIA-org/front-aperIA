/**
 * Os 8 tiles do marquee "CONSTRUÍDO SOBRE O ECOSSISTEMA QUE VOCÊ JÁ CONFIA".
 *
 * Dois deles (PROWLER e TruffleHog) são texto, não imagem — o original tem um
 * `logo-prowler.png` em `public/assets/` que nunca foi referenciado.
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

export const ECOSYSTEM_TILES: readonly EcosystemTile[] = [
  {
    kind: 'image',
    name: 'Semgrep',
    src: '/assets/logo-semgrep.png',
    width: 572,
    height: 98,
    fitClassName: 'max-h-[40px] max-w-[158px]',
  },
  {
    kind: 'image',
    name: 'Trivy',
    src: '/assets/logo-trivy.png',
    width: 500,
    height: 500,
    fitClassName: 'max-h-[52px] max-w-[96px]',
  },
  {
    kind: 'image',
    name: 'OWASP ZAP',
    src: '/assets/logo-zap.png',
    width: 3840,
    height: 3935,
    fitClassName: 'max-h-[46px] max-w-[100px]',
  },
  {
    kind: 'text',
    name: 'PROWLER',
    textClassName:
      'font-heading text-[19px] font-extrabold tracking-[0.01em] text-[#17191d]',
  },
  {
    kind: 'text',
    name: 'TruffleHog',
    textClassName:
      'font-heading text-[19px] font-bold tracking-[-0.01em] text-[#17191d]',
  },
  {
    kind: 'image',
    name: 'MITRE Caldera',
    src: '/assets/logo-caldera.png',
    width: 183,
    height: 126,
    fitClassName: 'max-h-[58px] max-w-[120px]',
  },
  {
    kind: 'image',
    name: 'MITRE ATT&CK',
    src: '/assets/logo-mitre-attack.png',
    width: 500,
    height: 300,
    fitClassName: 'max-h-[46px] max-w-[128px]',
  },
  {
    // OpenCTI saiu do stack (exigia ElasticSearch/RabbitMQ, vários GB). O threat
    // intel agora é CISA KEV + EPSS — feeds públicos, sem logo único, então tile
    // de texto como PROWLER/TruffleHog.
    kind: 'text',
    name: 'CISA KEV + EPSS',
    textClassName:
      'font-heading text-[16px] font-bold tracking-[-0.01em] text-[#17191d]',
  },
];
