/** Tipos do dashboard — espelham o schema do backend descrito no protótipo. */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Scanner =
  | 'trufflehog'
  | 'semgrep'
  | 'trivy'
  | 'prowler'
  | 'zap'
  | 'caldera';

export type FindingStatus = 'open' | 'resolved';

export type Criticality = 'critical' | 'high' | 'medium' | 'low';

export type Finding = {
  id: string;
  source: string;
  severity: Severity;
  title: string;
  description: string;
  commit_sha: string;
  repo_url?: string | null;
  cve_id: string | null;
  cwe_id: string | null;
  file_path: string;
  line_number: number;
  asset: string;
  asset_criticality: Criticality;
  secret_verified: boolean;
  secret_type: string | null;
  tier: number;
  created_at: string;
  /** Preenchido na montagem do dataset. */
  owner_team: string;
  status: FindingStatus;
  resolved_at: string | null;
  /** `true` nos findings sintéticos gerados para dar densidade ao dashboard. */
  placeholder?: boolean;
};

/**
 * Um TIPO de vulnerabilidade, com todas as suas ocorrências somadas.
 *
 * Espelha `FindingGroupResponse` da API (`GET /findings/groups`). Existe porque
 * a lista plana ficou ilegível com DAST: um scan do Juice Shop grava ~12 mil
 * findings que são, na prática, 14 problemas repetidos por milhares de rotas —
 * e o teto de 1000 da listagem plana cortava o resto. Agrupado, o mesmo
 * conjunto cabe inteiro na tela.
 *
 * As datas são ISO (o mesmo formato de `Finding.created_at`) para que
 * `timeAgo`/`fmtAbs` sirvam sem conversão.
 */
export type FindingGroup = {
  source: string;
  severity: Severity;
  tier: number;
  title: string;
  cve_id: string | null;
  cwe_id: string | null;
  /** Nullable no schema da API; no dataset do protótipo é sempre preenchido. */
  asset: string | null;
  /** Quantos findings o grupo representa. */
  ocorrencias: number;
  /** Quantos caminhos DISTINTOS — 3.007 ocorrências podem ser 1 caminho só. */
  caminhos: number;
  algum_secret_verificado: boolean;
  primeiro_em: string;
  ultimo_em: string;
  /** Liga o grupo a um finding concreto (deep link `?finding=<id>`). */
  exemplo_finding_id: string;
  /** Primeiros caminhos afetados — a expansão da linha não faz nova chamada. */
  amostra: string[];
};

/** `cancelled`: interrompido por quem disparou. Terminal, e distinto de
 *  `failed` — nada quebrou, alguém parou. */
export type TierStatus = 'done' | 'running' | 'failed' | 'skipped' | 'cancelled' | null;

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'blocked' | null;

export type ScanJob = {
  id: string;
  commit_sha: string;
  repo_full_name: string;
  pr_number: number;
  tier1_status: TierStatus;
  tier2_status: TierStatus;
  tier3_status: TierStatus;
  blocked_at_tier: number | null;
  final_risk_score: number | null;
  final_risk_level: RiskLevel;
  /**
   * Quando o COMMIT entrou no sistema — preservado entre reexecuções.
   *
   * Não é quando o scan rodou: reescanear o mesmo commit reaproveita a linha e
   * mantém este campo. Para "quando executou", use `started_at`.
   */
  created_at: string;
  /**
   * Início desta execução (`tier1_started_at` da API). Opcional porque o
   * dataset do protótipo não tem o campo — lá `created_at` já é a execução.
   * Leia sempre via `scanRanAt()`, nunca direto.
   */
  started_at?: string;
  t1_dur: string | null;
  t2_dur: string | null;
  t3_dur: string | null;
  /**
   * Início de CADA tier (`tierN_started_at` da API), na ordem dos tiers.
   *
   * Opcional porque o dataset do protótipo não tem os campos — lá só existe a
   * duração já formatada. É o que permite dizer "Tier 3 rodando há 12min" sem
   * projetar um fim: não há ETA em lugar nenhum do pipeline.
   */
  tier_started_at?: (string | null)[];
  /**
   * `findings_summary` de `GET /scans/{id}`: contagem por severidade, por tier e
   * total, agregada pela própria API.
   *
   * Opcional pelo mesmo motivo, e é o que dispensa buscar os findings só para
   * exibir um número — a contagem vem na mesma resposta do scan.
   */
  findings_summary?: FindingsSummary;
};

/** Agregado de findings de uma execução, como a API o devolve. */
export type FindingsSummary = {
  /** Chave = severidade; ausente quando a severidade não ocorreu. */
  by_severity: Record<string, number>;
  /** Chave = número do tier em texto ("1", "2", "3"). */
  by_tier: Record<string, number>;
  total: number;
};

export type RemediationStatus = 'suggested' | 'approved' | 'rejected' | 'merged';

export type Remediation = {
  id: string;
  finding_id: string;
  scan_job_id: string;
  status: RemediationStatus;
  explanation: string;
  patch_diff: string;
  requires_secret_rotation: boolean;
  rotation_instructions: string | null;
  approved_by: string | null;
  created_at: string;
};

/**
 * O que o card mostra ao redor da remediação: severidade e título do finding
 * de origem, o arquivo, e o PR onde a sugestão foi postada.
 *
 * Vem embutido em `GET /remediations`, do mesmo join que prova a posse. A
 * alternativa — resolver contra a lista de findings no cliente — obrigaria a
 * tela a varrer o conjunto inteiro do usuário para exibir algumas dezenas de
 * patches. No dataset do protótipo o contexto é montado a partir de
 * `FINDINGS` / `SCAN_JOBS`, que é de onde ele saía antes.
 */
export type RemediationContext = {
  finding?: Pick<Finding, 'id' | 'title' | 'severity' | 'file_path' | 'repo_url'>;
  job?: Pick<ScanJob, 'pr_number'>;
  /**
   * Onde o patch vive. A tela é o inventário de tudo que o pipeline gerou, e
   * só parte disso vira comentário no PR: scan manual não tem PR, e o GitHub
   * recusa comentário inline em arquivo fora do diff. Sem este campo os dois
   * casos ficavam indistinguíveis de um patch postado.
   */
  destino: RemediationDestino;
};

export type RemediationDestino =
  /** Virou code suggestion; `commentUrl` abre o comentário exato. */
  | { tipo: 'suggestion'; commentUrl: string }
  /** Gerado num scan de branch — não havia PR onde comentar. */
  | { tipo: 'sem-pr' }
  /** O arquivo não está no diff do PR; o GitHub recusaria o comentário. */
  | { tipo: 'fora-do-diff' };

/** Uma remediação junto do seu contexto — o que a tela de fato renderiza. */
export type RemediationItem = Remediation & RemediationContext;

export type PrioritizedAction = {
  priority: number;
  action: string;
  rationale: string;
};

export type Asset = {
  id: string;
  name: string;
  type: 'repository' | 'cloud';
  repo_url: string | null;
  criticality: Criticality;
  last_scan: string;
  risk_score: number;
  scanners: string[];
};

export type InstallationRepo = {
  name: string;
  private: boolean;
  lang: string;
  last_push: string;
};

export type VulnTemplate = {
  cls: string;
  cwe: string;
  scanner: string;
  sev: Severity[];
  titles: string[];
  files: string[];
  cve?: boolean;
};

