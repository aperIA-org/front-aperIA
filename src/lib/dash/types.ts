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

export type TierStatus = 'done' | 'running' | 'failed' | 'skipped' | null;

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
  created_at: string;
  t1_dur: string | null;
  t2_dur: string | null;
  t3_dur: string | null;
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

export type AttackStep = {
  step: number;
  phase: string;
  technique: string;
  description: string;
  finding_ids: string[];
  caldera_validated: boolean;
};

export type PrioritizedAction = {
  priority: number;
  action: string;
  rationale: string;
};

export type Insight = {
  attack_path?: AttackStep[];
  kill_chain_complete?: boolean;
  prioritized_actions?: PrioritizedAction[];
  kill_chain_complete_note?: string;
  cti_status?: string;
  caldera_status?: string;
  tier2_summary?: string;
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

export type IntegrationStatus = 'operational' | 'degraded' | 'offline';

export type Integration = {
  id: string;
  name: string;
  desc: string;
  /** Em qual tier do pipeline o scanner roda (T1, T1+T2, T2, T3…). */
  tier: string;
  status: IntegrationStatus;
  last_run: string;
  /** `null` na engine de I.A., que não produz findings próprios. */
  findings_total: number | null;
  version: string;
  /** Texto de impacto, exibido quando o status não é operational. */
  impact?: string;
};
