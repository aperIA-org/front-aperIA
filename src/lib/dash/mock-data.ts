/**
 * Dados mock do dashboard — TODOS determinísticos.
 *
 * Duas regras que não podem ser quebradas:
 *
 * 1. O relógio é CONGELADO em `REF_NOW` (2024-06-29T16:00:00Z). Nunca use
 *    `Date.now()` aqui: os timestamps relativos ("3d atrás") passariam a
 *    mudar a cada visita.
 * 2. Os findings sintéticos vêm de um PRNG semeado (`mulberry32(20240629)`).
 *    A ORDEM das chamadas de `rnd()` faz parte do contrato — mexer nela muda
 *    todo o dataset. As chamadas condicionais (curto-circuito em `&&`) são
 *    especialmente sensíveis.
 *
 * Os literais abaixo foram extraídos verbatim de `legacy/dash/index.html`.
 */
import type {
  Asset,
  Finding,
  InstallationRepo,
  Remediation,
  ScanJob,
  VulnTemplate,
} from './types';

/** Relógio congelado do protótipo. */
export const REF_NOW = new Date('2024-06-29T16:00:00Z').getTime();
export const DAY = 86400000;

type HeroSeed = Omit<Finding, 'owner_team' | 'status' | 'resolved_at'> &
  Partial<Pick<Finding, 'status' | 'resolved_at'>>;

const HERO_FINDINGS: HeroSeed[] = [
  {id:'f1',source:'trufflehog',severity:'critical',title:'AWS Access Key exposta no código-fonte',description:'Credencial AWS verificada encontrada em texto plano no arquivo de configuração. A chave tem permissões amplas (AdministratorAccess) e foi confirmada como ativa via AWS STS GetCallerIdentity.',commit_sha:'a3f8c1d2e4b56789abcdef01',repo_url:'https://github.com/OCR-aperIA/payments-api',cve_id:null,cwe_id:'CWE-312',file_path:'src/config.py',line_number:42,asset:'payments-api',asset_criticality:'high',secret_verified:true,secret_type:'aws_access_key',tier:1,created_at:'2024-06-29T14:23:11Z'},
  {id:'f2',source:'semgrep',severity:'high',title:'SQL Injection via raw query em ORM',description:'Interpolação direta de parâmetro não sanitizado em query SQL. Permite UNION-based data extraction, podendo expor toda a tabela de usuários e hashes de senha.',commit_sha:'a3f8c1d2e4b56789abcdef01',repo_url:'https://github.com/OCR-aperIA/payments-api',cve_id:'CVE-2024-38856',cwe_id:'CWE-89',file_path:'app/repositories/user_repo.py',line_number:87,asset:'payments-api',asset_criticality:'high',secret_verified:false,secret_type:null,tier:2,created_at:'2024-06-29T14:25:33Z'},
  {id:'f3',source:'trivy',severity:'critical',title:'Log4Shell RCE em dependência transitiva',description:'log4j-core 2.14.1 vulnerável a execução remota de código via JNDI lookup. CVSS 10.0. Caminho de ataque confirmado pela I.A como exploitável no ambiente atual.',commit_sha:'a3f8c1d2e4b56789abcdef01',repo_url:'https://github.com/OCR-aperIA/payments-api',cve_id:'CVE-2021-44228',cwe_id:'CWE-400',file_path:'pom.xml',line_number:234,asset:'payments-api',asset_criticality:'high',secret_verified:false,secret_type:null,tier:2,created_at:'2024-06-29T14:26:01Z'},
  {id:'f4',source:'semgrep',severity:'high',title:'Path traversal em upload de arquivos',description:'Parâmetro filename não validado permite navegação no sistema de arquivos do servidor. Atacante pode ler /etc/passwd ou sobrescrever arquivos de configuração.',commit_sha:'b7e9f2a1c3d45678abcdef02',repo_url:'https://github.com/OCR-aperIA/auth-service',cve_id:null,cwe_id:'CWE-22',file_path:'api/upload_handler.py',line_number:156,asset:'auth-service',asset_criticality:'critical',secret_verified:false,secret_type:null,tier:1,created_at:'2024-06-28T09:44:52Z'},
  {id:'f5',source:'zap',severity:'high',title:'CORS misconfiguration permite origem arbitrária',description:'Header Access-Control-Allow-Origin: * com credenciais habilitadas. Permite ataques cross-origin autenticados a partir de qualquer domínio.',commit_sha:'b7e9f2a1c3d45678abcdef02',repo_url:'https://github.com/OCR-aperIA/auth-service',cve_id:null,cwe_id:'CWE-346',file_path:'api/middleware/cors.py',line_number:23,asset:'auth-service',asset_criticality:'critical',secret_verified:false,secret_type:null,tier:3,created_at:'2024-06-28T10:12:09Z'},
  {id:'f6',source:'prowler',severity:'medium',title:'Bucket S3 com ACL pública habilitada',description:'Bucket de artefatos de build exposto publicamente. Contém binários internos e arquivos de configuração de CI/CD que podem revelar a arquitetura interna.',commit_sha:'a3f8c1d2e4b56789abcdef01',repo_url:'https://github.com/OCR-aperIA/payments-api',cve_id:null,cwe_id:'CWE-284',file_path:'infra/terraform/s3.tf',line_number:18,asset:'infra-aws',asset_criticality:'medium',secret_verified:false,secret_type:null,tier:2,created_at:'2024-06-29T14:27:44Z'},
  {id:'f7',source:'semgrep',severity:'medium',title:'Logging de dados de cartão em produção',description:'Campos de número de cartão e CVV sendo logados em texto plano no módulo de pagamento. Viola PCI-DSS. Logs acessíveis por todos os engenheiros com acesso ao Datadog.',commit_sha:'c9a1b3e5d7f89012abcdef03',repo_url:'https://github.com/OCR-aperIA/payments-api',cve_id:null,cwe_id:'CWE-532',file_path:'app/services/payment_service.py',line_number:201,asset:'payments-api',asset_criticality:'high',secret_verified:false,secret_type:null,tier:1,created_at:'2024-06-27T16:58:22Z'},
  {id:'f8',source:'trivy',severity:'medium',title:'OpenSSL 3.0.7, DoS via certificado X.509',description:'Versão vulnerável a denial-of-service durante verificação de cadeia de certificados X.509 excessivamente longa. Pode derrubar o serviço de autenticação.',commit_sha:'c9a1b3e5d7f89012abcdef03',repo_url:'https://github.com/OCR-aperIA/auth-service',cve_id:'CVE-2022-3786',cwe_id:'CWE-119',file_path:'requirements.txt',line_number:12,asset:'auth-service',asset_criticality:'critical',secret_verified:false,secret_type:null,tier:2,created_at:'2024-06-27T17:02:11Z'},
  {id:'f9',source:'semgrep',severity:'low',title:'Hash MD5 sem salt para senha de usuário',description:'Hash MD5 sem salt para armazenamento de credenciais. Vulnerável a rainbow tables. Recomendado migrar para bcrypt com work factor ≥ 12 ou Argon2id.',commit_sha:'d2c4e6a8b0f12345abcdef04',repo_url:'https://github.com/OCR-aperIA/user-service',cve_id:null,cwe_id:'CWE-327',file_path:'services/auth/password.py',line_number:67,asset:'user-service',asset_criticality:'medium',secret_verified:false,secret_type:null,tier:1,created_at:'2024-06-26T11:33:45Z'},
  {id:'f10',source:'trufflehog',severity:'info',title:'Token de API de teste detectado',description:'Token de ambiente de desenvolvimento encontrado. Não verificado como ativo. Remover por higiene de código e para não confundir auditorias futuras.',commit_sha:'d2c4e6a8b0f12345abcdef04',repo_url:'https://github.com/OCR-aperIA/user-service',cve_id:null,cwe_id:null,file_path:'tests/fixtures/test_config.py',line_number:8,asset:'user-service',asset_criticality:'low',secret_verified:false,secret_type:'api_key',tier:1,created_at:'2024-06-26T11:35:12Z'},
];

export const REPO_TEAM: Record<string, string> = {'payments-api':'Payments','auth-service':'Identity','user-service':'Core Platform','infra-aws':'Infra / SRE'};

const CWE_CLASS: Record<string, string> = {'CWE-312':'Secrets expostos','CWE-798':'Secrets expostos','CWE-532':'Secrets expostos','CWE-89':'Injection','CWE-79':'Injection','CWE-78':'Injection','CWE-22':'Injection','CWE-90':'Injection','CWE-400':'Dependência vulnerável','CWE-1104':'Dependência vulnerável','CWE-119':'Dependência vulnerável','CWE-937':'Dependência vulnerável','CWE-16':'Misconfiguration','CWE-284':'Misconfiguration','CWE-346':'Misconfiguration','CWE-732':'Misconfiguration','CWE-327':'Criptografia fraca','CWE-326':'Criptografia fraca','CWE-328':'Criptografia fraca'};

export function cweClass(f: Pick<Finding, 'cwe_id'>): string {
  return (f.cwe_id ? CWE_CLASS[f.cwe_id] : undefined) ?? 'Outros';
}

const VULN_TEMPLATES: VulnTemplate[] = [
  {cls:'Secrets expostos',cwe:'CWE-798',scanner:'trufflehog',sev:['critical','high','high','medium'],titles:['Chave de API commitada em variável de ambiente','Token OAuth exposto em arquivo de log','Credencial de banco em docker-compose','Chave privada SSH versionada no repositório'],files:['config/settings.py','.env.sample','docker-compose.yml','deploy/secrets.yaml']},
  {cls:'Injection',cwe:'CWE-89',scanner:'semgrep',sev:['critical','high','high','medium'],titles:['SQL injection em filtro de busca','Command injection via subprocess','XSS refletido em parâmetro de query','Path traversal em download de arquivo'],files:['app/api/search.py','app/tasks/runner.py','templates/profile.html','app/api/files.py']},
  {cls:'Dependência vulnerável',cwe:'CWE-1104',scanner:'trivy',sev:['critical','high','medium','medium','low'],titles:['CVE em biblioteca de serialização','Dependência transitiva com RCE conhecido','Versão vulnerável de framework web','Pacote com prototype pollution'],files:['requirements.txt','pom.xml','package-lock.json','go.mod'],cve:true},
  {cls:'Misconfiguration',cwe:'CWE-16',scanner:'prowler',sev:['high','medium','medium','low'],titles:['Security group aberto para 0.0.0.0/0 na porta 22','Bucket S3 sem criptografia em repouso','IAM role com privilégio excessivo','CloudTrail desabilitado na conta'],files:['infra/terraform/network.tf','infra/terraform/s3.tf','infra/terraform/iam.tf','infra/terraform/cloudtrail.tf']},
  {cls:'Criptografia fraca',cwe:'CWE-327',scanner:'semgrep',sev:['medium','low','low','info'],titles:['Uso de DES para cifragem de dados','TLS 1.0 aceito no handshake','Gerador de aleatórios inseguro em token','Hash SHA-1 para verificação de integridade'],files:['app/crypto/cipher.py','app/net/tls.py','app/utils/random.py','app/utils/hash.py']},
];

export const SCAN_JOBS: ScanJob[] = [
  {id:'s1',commit_sha:'a3f8c1d2e4',repo_full_name:'OCR-aperIA/payments-api',pr_number:47,tier1_status:'done',tier2_status:'done',tier3_status:'done',blocked_at_tier:null,final_risk_score:847,final_risk_level:'critical',created_at:'2024-06-29T14:20:00Z',t1_dur:'4m',t2_dur:'4m',t3_dur:'7m'},
  {id:'s2',commit_sha:'b7e9f2a1c3',repo_full_name:'OCR-aperIA/auth-service',pr_number:31,tier1_status:'done',tier2_status:'done',tier3_status:'running',blocked_at_tier:null,final_risk_score:null,final_risk_level:null,created_at:'2024-06-29T10:15:00Z',t1_dur:'4m',t2_dur:'7m',t3_dur:null},
  {id:'s3',commit_sha:'c9a1b3e5d7',repo_full_name:'OCR-aperIA/payments-api',pr_number:46,tier1_status:'done',tier2_status:'done',tier3_status:'skipped',blocked_at_tier:null,final_risk_score:312,final_risk_level:'medium',created_at:'2024-06-27T16:50:00Z',t1_dur:'5m',t2_dur:'8m',t3_dur:null},
  {id:'s4',commit_sha:'e5a9b7c1d3',repo_full_name:'OCR-aperIA/payments-api',pr_number:45,tier1_status:'done',tier2_status:'failed',tier3_status:null,blocked_at_tier:2,final_risk_score:null,final_risk_level:null,created_at:'2024-06-26T08:30:00Z',t1_dur:'5m',t2_dur:null,t3_dur:null},
  {id:'s5',commit_sha:'d2c4e6a8b0',repo_full_name:'OCR-aperIA/user-service',pr_number:22,tier1_status:'done',tier2_status:'done',tier3_status:'skipped',blocked_at_tier:null,final_risk_score:156,final_risk_level:'low',created_at:'2024-06-26T11:30:00Z',t1_dur:'6m',t2_dur:'8m',t3_dur:null},
  {id:'s6',commit_sha:'f1e3d5c7b9',repo_full_name:'OCR-aperIA/payments-api',pr_number:44,tier1_status:'done',tier2_status:'skipped',tier3_status:'skipped',blocked_at_tier:1,final_risk_score:null,final_risk_level:'blocked',created_at:'2024-06-25T15:00:00Z',t1_dur:'4m',t2_dur:null,t3_dur:null},
];

export const REMEDIATIONS: Remediation[] = [
  {id:'r1',finding_id:'f2',scan_job_id:'s1',status:'suggested',explanation:'Usar SQLAlchemy parametrizado ao invés de interpolação de string. O ORM já oferece proteção via bind parameters, substituição de 2 linhas.',patch_diff:'-    query = f"SELECT * FROM users WHERE email = \'{email}\'"\n-    result = db.execute(query)\n+    result = db.execute(\n+        select(User).where(User.email == email)\n+    ).scalars().first()',requires_secret_rotation:false,rotation_instructions:null,approved_by:null,created_at:'2024-06-29T14:36:00Z'},
  {id:'r2',finding_id:'f1',scan_job_id:'s1',status:'suggested',explanation:'A credencial AWS AKIAIOSFODNN7EXAMPLE deve ser rotacionada imediatamente. Remova do código e use variáveis de ambiente ou AWS Secrets Manager.',patch_diff:'-AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"\n-AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCY"\n+AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]\n+AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]',requires_secret_rotation:true,rotation_instructions:'1. AWS IAM Console → desative AKIAIOSFODNN7EXAMPLE imediatamente\n2. Crie nova access key com política de menor privilégio\n3. Atualize secrets no GitHub Actions (Settings → Secrets)\n4. Atualize ECS Task Definitions com nova chave',approved_by:null,created_at:'2024-06-29T14:36:30Z'},
  {id:'r3',finding_id:'f7',scan_job_id:'s3',status:'approved',explanation:'Mascarar campos sensíveis antes de logar usando serializer que redacta PAN e CVV.',patch_diff:'-    logger.info("payment_processed", card_number=card_number, cvv=cvv)\n+    logger.info("payment_processed", card_last4=card_number[-4:], masked=True)',requires_secret_rotation:false,rotation_instructions:null,approved_by:'marina.alves@acme.io',created_at:'2024-06-27T17:10:00Z'},
  {id:'r4',finding_id:'f4',scan_job_id:'s2',status:'suggested',explanation:'Sanitizar filename com os.path.basename() e validar contra allowlist de extensões antes de usar no sistema de arquivos.',patch_diff:'-    filepath = os.path.join(UPLOAD_DIR, filename)\n+    safe_name = os.path.basename(filename)\n+    if not safe_name.endswith(ALLOWED_EXTENSIONS):\n+        raise ValueError("Extensão não permitida")\n+    filepath = os.path.join(UPLOAD_DIR, safe_name)',requires_secret_rotation:false,rotation_instructions:null,approved_by:null,created_at:'2024-06-28T10:30:00Z'},
  {id:'r5',finding_id:'f9',scan_job_id:'s5',status:'rejected',explanation:'Migrar para bcrypt com work factor ≥ 12. Usar passlib para abstração. Inclui migration script para re-hash de senhas existentes no próximo login.',patch_diff:'-import hashlib\n-hashed = hashlib.md5(password.encode()).hexdigest()\n+from passlib.hash import bcrypt\n+hashed = bcrypt.hash(password, rounds=12)',requires_secret_rotation:false,rotation_instructions:null,approved_by:'carlos.melo@acme.io',created_at:'2024-06-26T12:00:00Z'},
];

export const ASSETS: Asset[] = [
  {id:'a1',name:'payments-api',type:'repository',repo_url:'https://github.com/OCR-aperIA/payments-api',criticality:'high',last_scan:'2024-06-29',risk_score:847,scanners:['trufflehog','semgrep','trivy','prowler','zap']},
  {id:'a2',name:'auth-service',type:'repository',repo_url:'https://github.com/OCR-aperIA/auth-service',criticality:'critical',last_scan:'2024-06-28',risk_score:412,scanners:['semgrep','trivy','zap']},
  {id:'a3',name:'user-service',type:'repository',repo_url:'https://github.com/OCR-aperIA/user-service',criticality:'medium',last_scan:'2024-06-26',risk_score:156,scanners:['semgrep','trufflehog']},
  {id:'a4',name:'infra-aws',type:'cloud',repo_url:null,criticality:'medium',last_scan:'2024-06-29',risk_score:205,scanners:['prowler']},
];

/** GitHub App + installation_id → a installation dá acesso aos repos. */
export const GH_ORG = 'OCR-aperIA';

export const INSTALLATION_REPOS: InstallationRepo[] = [
  {name:'payments-api',private:true,lang:'Python',last_push:'2024-06-29T14:30:00Z'},
  {name:'auth-service',private:true,lang:'Python',last_push:'2024-06-28T09:50:00Z'},
  {name:'user-service',private:true,lang:'Python',last_push:'2024-06-26T16:20:00Z'},
  {name:'notifications-worker',private:true,lang:'Go',last_push:'2024-06-25T11:00:00Z'},
  {name:'web-dashboard',private:true,lang:'TypeScript',last_push:'2024-06-29T08:15:00Z'},
  {name:'mobile-app',private:true,lang:'Kotlin',last_push:'2024-06-20T13:40:00Z'},
  {name:'docs-site',private:false,lang:'MDX',last_push:'2024-06-18T10:00:00Z'},
  {name:'legacy-billing',private:true,lang:'Ruby',last_push:'2024-05-30T17:00:00Z'},
];

export const DEFAULT_MONITORED = ['payments-api', 'auth-service', 'user-service'];
export const DEFAULT_GH_INSTALLED_AT = '2024-06-25T09:00:00Z';

/** PRNG do protótipo — não substituir por Math.random(). */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Gera 80 findings sintéticos + os 10 "hero" escritos à mão.
 *
 * Transcrição literal do original: a sequência de `rnd()` está preservada,
 * inclusive as chamadas que só acontecem por curto-circuito (`scanner` e
 * `secret_verified`) e a ordem de avaliação das propriedades do objeto.
 */
function buildFindings(): Finding[] {
  const rnd = mulberry32(20240629);
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
  const repos = ['payments-api', 'auth-service', 'user-service', 'infra-aws'];
  const repoW = [0.42, 0.28, 0.18, 0.12];
  const wpick = (a: readonly string[], w: readonly number[]): string => {
    const r = rnd();
    let acc = 0;
    for (let i = 0; i < a.length; i++) {
      acc += w[i];
      if (r <= acc) return a[i];
    }
    return a[a.length - 1];
  };
  const tierForSev = (s: string): number =>
    s === 'critical'
      ? pick([2, 2, 3, 3, 1])
      : s === 'high'
        ? pick([2, 3, 2, 1])
        : s === 'medium'
          ? pick([1, 2, 2])
          : pick([1, 1, 2]);

  const TPOOL = [
    VULN_TEMPLATES[0], VULN_TEMPLATES[1], VULN_TEMPLATES[1],
    VULN_TEMPLATES[2], VULN_TEMPLATES[2], VULN_TEMPLATES[2],
    VULN_TEMPLATES[3], VULN_TEMPLATES[3], VULN_TEMPLATES[4],
  ];

  const out: Finding[] = [];
  const N = 80;
  for (let i = 0; i < N; i++) {
    const t = pick(TPOOL);
    const repo = wpick(repos, repoW);
    const sev = pick(t.sev);
    const tier = tierForSev(sev);
    const ageDays = Math.floor(Math.pow(rnd(), 0.85) * 90);
    const created = REF_NOW - ageDays * DAY - Math.floor(rnd() * DAY);
    const p =
      0.32 + (ageDays / 90) * 0.45 -
      (sev === 'critical' ? 0.28 : sev === 'high' ? 0.14 : 0);

    let status: Finding['status'] = 'open';
    let resolved_at: string | null = null;
    if (ageDays > 3 && rnd() < p) {
      status = 'resolved';
      const span = Math.max(1, Math.min(ageDays - 1, 50));
      const rd = created + (1 + Math.floor(rnd() * span)) * DAY;
      resolved_at = new Date(Math.min(rd, REF_NOW - DAY)).toISOString();
    }

    const scanner =
      t.cls === 'Misconfiguration' && rnd() < 0.35 ? 'zap' : t.scanner;

    out.push({
      id: 'g' + (i + 1),
      source: scanner,
      severity: sev,
      tier,
      asset: repo,
      owner_team: REPO_TEAM[repo],
      title: pick(t.titles),
      description:
        'Finding sintético (placeholder de demonstração), dado simulado para densidade do dashboard.',
      file_path: pick(t.files),
      line_number: 1 + Math.floor(rnd() * 420),
      cve_id: t.cve ? 'CVE-2024-' + (10000 + Math.floor(rnd() * 89999)) : null,
      cwe_id: t.cwe,
      secret_verified:
        t.cls === 'Secrets expostos' && sev === 'critical' && rnd() < 0.5,
      secret_type: t.cls === 'Secrets expostos' ? 'generic' : null,
      asset_criticality: 'medium',
      commit_sha: '',
      placeholder: true,
      status,
      resolved_at,
      created_at: new Date(created).toISOString(),
    });
  }

  const heroes: Finding[] = HERO_FINDINGS.map((f) => ({
    ...f,
    owner_team: REPO_TEAM[f.asset] || '—',
    status: f.status || 'open',
    resolved_at: f.resolved_at || null,
  }));

  return [...heroes, ...out];
}

export const FINDINGS: Finding[] = buildFindings();

export function openFindings(): Finding[] {
  return FINDINGS.filter((f) => f.status !== 'resolved');
}

