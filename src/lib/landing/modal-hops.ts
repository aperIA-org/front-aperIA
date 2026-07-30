/**
 * Os 5 hops do attack path exibidos no modal.
 *
 * Atenção às cores: o painel do modal é escuro (#12151b), mas o markup original
 * foi escrito com as cores do tema claro e três regras `[style*="rgb(...)"]`
 * corrigiam isso em runtime. Aqui os valores finais já estão autorais —
 * #181a1d virou #f4f5f7 e #565961 virou #aeb3bd.
 */
export type ModalHop = {
  title: string;
  meta: string;
  gain: string;
  /** Cor do ponto e da borda do ponto na trilha. */
  dot: string;
  dotBorder: string;
  /** Gradiente do conector até o próximo hop. */
  connector: string;
  connectorMinHeight: number;
  /** O hop 4 tem um brilho extra no ponto. */
  dotShadow?: string;
};

export const MODAL_HOPS: readonly ModalHop[] = [
  {
    title: 'SSRF força leitura do metadata da nuvem',
    meta: 'web-edge · api/fetch.py:53 → 169.254.169.254 · T1190 / T1552.005',
    gain: 'obtém: credencial IAM temporária (STS)',
    dot: '#3a3f48',
    dotBorder: '#565c66',
    connector: 'linear-gradient(180deg,#565c66,#7a2530)',
    connectorMinHeight: 34,
  },
  {
    title: 'Cadeia de assume-role mal configurada',
    meta: 'sts:AssumeRole · trust policy permissiva · T1078.004',
    gain: 'obtém: sessão privilegiada do pipeline de CI',
    dot: '#7a2530',
    dotBorder: '#a33540',
    connector: 'linear-gradient(180deg,#a33540,#b02a34)',
    connectorMinHeight: 34,
  },
  {
    title: 'RCE no runner via dependência comprometida',
    meta: 'ci-runner · supply-chain · T1195.002 / T1610',
    gain: 'obtém: execução de código no pipeline',
    dot: '#b02a34',
    dotBorder: '#d13340',
    connector: 'linear-gradient(180deg,#d13340,#e5333b)',
    connectorMinHeight: 34,
  },
  {
    title: 'Service account exfiltra chave de federação',
    meta: 'k8s secrets-store · vault · T1552.007 / T1550',
    gain: 'obtém: chave do conector de identidade (AD)',
    dot: '#e5333b',
    dotBorder: '#ff5a61',
    connector: 'linear-gradient(180deg,#ff5a61,#ff4d54)',
    connectorMinHeight: 38,
    dotShadow: '0 0 10px -2px #e5333b',
  },
];

/** O 5º hop é o painel de objetivo alcançado, com layout próprio. */
export const MODAL_GOAL = {
  eyebrow: '◎ OBJETIVO ATINGIDO',
  title: 'Golden ticket · controle total do domínio',
  meta: 'domain-admin · federação AD forjada · T1558 / T1098',
} as const;

/** Diff sugerido no rodapé do modal. */
export const MODAL_DIFF = {
  file: 'infra/compute.tf · corta o hop 1, quebra a cadeia',
  removed: 'metadata_options { http_tokens = "optional" }',
  added:
    'metadata_options { http_tokens = "required", http_put_response_hop_limit = 1 }',
} as const;
