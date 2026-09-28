/**
 * Monta a versão do relatório destinada a uma ferramenta de I.A pessoal.
 *
 * Markdown, e não JSON ou PDF: é o formato que um modelo de linguagem lê melhor
 * e que a pessoa também consegue revisar antes de colar em algum lugar — o
 * arquivo sai da mão dela e vai para um serviço de terceiros, então precisa ser
 * legível a olho nu.
 *
 * **Objetivo, e não completo.** A tela mostra tudo; este arquivo é o que cabe
 * numa janela de contexto sem afogar o modelo. Por isso os findings vêm
 * AGRUPADOS por tipo (um scan com teste dinâmico grava milhares de ocorrências
 * que são dezenas de problemas repetidos por rota) e limitados aos mais graves,
 * com a contagem do que ficou de fora declarada — um corte silencioso faria o
 * modelo concluir sobre um conjunto que ele pensa ser inteiro.
 *
 * **A regra de não nomear a ferramenta vale aqui.** O arquivo é conteúdo que o
 * usuário lê e reenvia, então passa pelos mesmos dois pontos de tradução do
 * resto do produto: `sourceLabel()` para a origem de um finding e
 * `tierToolRuns()` para as etapas. Ver o cabeçalho de `pipeline-tools.ts`.
 */
import { fmtAbs, sourceLabel, TIER_META } from './format';
import {
  chainEmulated,
  chainTitle,
  CHAIN_OUTCOME_LABEL,
  outcomeOf,
  iaChains,
  tierToolRuns,
  type ScanIaSummary,
  type ToolRunDto,
} from './pipeline-tools';
import { scanRanAt } from './format';
import type { FindingGroup, ScanJob } from './types';

/** Teto de tipos de finding no arquivo. Acima disso, o resto vira uma contagem. */
const MAX_GRUPOS = 40;
/**
 * Caminhos listados por tipo. A API já devolve até 8 na amostra do grupo, e
 * mostrar todos multiplicaria o arquivo por pouco: quem precisa da lista
 * completa abre a tela. O que importa para o modelo é reconhecer ONDE o
 * problema vive, e a contagem de caminhos restantes vai declarada.
 */
const MAX_CAMINHOS = 5;

const SEV_ORDEM = ['critical', 'high', 'medium', 'low', 'info'];

const RECOMENDACAO_PT: Record<string, string> = {
  bloquear: 'bloquear o merge',
  corrigir: 'corrigir antes de seguir',
  monitorar: 'monitorar',
};

export type EntradaExportIa = {
  job: ScanJob;
  ia: ScanIaSummary | null;
  runs: ToolRunDto[];
  grupos: FindingGroup[];
  /** Total real de ocorrências, que pode ser maior que a soma dos grupos exibidos. */
  totalFindings: number;
  targetUrl?: string | null;
};

/** Nome do arquivo: repositório e commit curto, para não virar `relatorio(3).md`. */
export function nomeArquivoIa(job: ScanJob): string {
  const repo = (job.repo_full_name.split('/')[1] ?? 'repo').replace(/[^\w.-]/g, '-');
  return `aperia-${repo}-${job.commit_sha.slice(0, 7)}.md`;
}

export function montarRelatorioIa({
  job,
  ia,
  runs,
  grupos,
  totalFindings,
  targetUrl,
}: EntradaExportIa): string {
  const l: string[] = [];
  const add = (...linhas: string[]) => l.push(...linhas);

  // Cabeçalho de contexto: sem ele o modelo recebe uma tabela de vulnerabilidades
  // sem saber de onde veio nem o que se espera dele.
  add(
    '# Relatório de segurança de aplicação',
    '',
    'Gerado pelo aperIA, uma plataforma de análise de postura de segurança. Este arquivo',
    'é um resumo de uma execução do pipeline sobre um commit específico. Os achados vêm',
    'de varreduras automatizadas e de uma análise por modelo de linguagem; nem todos são',
    'necessariamente exploráveis no contexto real da aplicação.',
    '',
    '## Identificação',
    '',
    `- Repositório: ${job.repo_full_name}`,
    `- Commit: ${job.commit_sha}`,
    `- Origem: ${job.pr_number ? `pull request #${job.pr_number}` : 'execução manual'}`,
    `- Data da execução: ${fmtAbs(scanRanAt(job))}`,
  );
  if (targetUrl) add(`- Alvo do teste dinâmico: ${targetUrl}`);
  add('');

  /* ── veredito ────────────────────────────────────────────────────────────── */
  add('## Veredito', '');
  add(
    `- Risco: ${job.final_risk_score ?? 'não calculado'}${
      job.final_risk_score !== null ? '/100' : ''
    }${job.final_risk_level ? ` (${job.final_risk_level})` : ''}`,
  );
  const rec = ia?.verdict?.recommendation;
  if (rec) add(`- Recomendação do pipeline: ${RECOMENDACAO_PT[rec] ?? rec}`);
  if (ia?.verdict?.headline) add(`- Leitura executiva: ${ia.verdict.headline}`);
  if (ia?.effort?.label) add(`- Esforço de correção: ${ia.effort.label}`);
  if (ia?.deadline?.label) add(`- Prazo recomendado: ${ia.deadline.label}`);
  add(`- Total de ocorrências: ${totalFindings}`);
  if (!ia) {
    add(
      '',
      'Observação: a análise aprofundada não está disponível nesta execução — ou ela não',
      'chegou a rodar, ou o modelo não respondeu. Ausência aqui não significa ausência de risco.',
    );
  }
  add('');

  /* ── impacto ─────────────────────────────────────────────────────────────── */
  if (ia?.impact) {
    add('## Impacto ao negócio', '');
    if (ia.impact.headline) add(ia.impact.headline, '');
    for (const area of ia.impact.areas ?? []) {
      if (!area.title) continue;
      const sev = area.severity ? ` [${area.severity}]` : '';
      add(`- **${area.title}**${sev}${area.detail ? ` — ${area.detail}` : ''}`);
    }
    const notas: [string, typeof ia.impact.if_fixed_now][] = [
      ['Se corrigir agora', ia.impact.if_fixed_now],
      ['Se postergar', ia.impact.if_deferred],
      ['Exposição regulatória', ia.impact.regulatory],
    ];
    const comNota = notas.filter(([, nota]) => nota?.headline);
    if (comNota.length) {
      add('');
      for (const [rotulo, nota] of comNota) {
        add(`- ${rotulo}: ${nota!.headline}${nota!.detail ? ` — ${nota!.detail}` : ''}`);
      }
    }
    add('');
  }

  /* ── caminhos de ataque ──────────────────────────────────────────────────── */
  const cadeias = iaChains(ia);
  if (cadeias.length) {
    add('## Caminhos de ataque', '');
    add(
      'Cada caminho é uma sequência de passos que um atacante poderia encadear. O desfecho',
      'de cada passo diz o que foi de fato observado:',
      '',
      '- `emulado`: executado contra um alvo de teste e o movimento passou',
      '- `bloqueado`: executado e um controle conteve',
      '- `não emulado`: não houve como tentar (sem alvo ou sem agente)',
      '- `projeção`: inferência do modelo, sem execução',
      '',
    );
    cadeias.forEach((cadeia, i) => {
      const { ok, total } = chainEmulated(cadeia);
      add(
        `### ${chainTitle(cadeia, i)}`,
        '',
        `Severidade: ${cadeia.severity ?? 'não informada'} · ${ok} de ${total} passos emulados`,
        '',
      );
      (cadeia.steps ?? []).forEach((passo, j) => {
        const partes = [
          passo.phase ? `fase: ${passo.phase}` : null,
          passo.tactic ? `tática ${passo.tactic}` : null,
          passo.technique ? `técnica ${passo.technique}` : null,
          passo.asset ? `onde: ${passo.asset}` : null,
          `desfecho: ${CHAIN_OUTCOME_LABEL[outcomeOf(passo.outcome)]}`,
        ].filter(Boolean);
        add(`${j + 1}. ${partes.join(' · ')}`);
        if (passo.evidence) add(`   - ${passo.evidence}`);
      });
      add('');
    });
  }

  /* ── inteligência e emulação ─────────────────────────────────────────────── */
  if (ia?.cti || ia?.caldera) {
    add('## Sinais externos', '');
    if (ia.cti) {
      const sinais = [
        ia.cti.known_exploited ? 'há CVE com exploração conhecida no mundo real' : null,
        ia.cti.epss_score !== null
          ? `probabilidade de exploração em 30 dias: ${ia.cti.epss_score}`
          : null,
        ia.cti.active_threat ? 'associado a campanha ativa' : null,
      ].filter(Boolean);
      add(`- Inteligência de ameaças: ${sinais.length ? sinais.join('; ') : 'nada relevante'}`);
      if (ia.cti.mitre_techniques?.length) {
        add(`- Técnicas MITRE associadas: ${ia.cti.mitre_techniques.join(', ')}`);
      }
    }
    if (ia.caldera) {
      add(
        `- Emulação: ${ia.caldera.techniques_successful} de ${ia.caldera.techniques_executed}` +
          ` técnicas executadas com sucesso${ia.caldera.validated ? ' (validada)' : ''}`,
      );
    }
    add('');
  }

  /* ── findings ────────────────────────────────────────────────────────────── */
  add('## Achados', '');
  if (!grupos.length) {
    add('Nenhum achado registrado nesta execução.', '');
  } else {
    const ordenados = [...grupos].sort((a, b) => {
      const s = SEV_ORDEM.indexOf(a.severity) - SEV_ORDEM.indexOf(b.severity);
      return s !== 0 ? s : b.ocorrencias - a.ocorrencias;
    });
    const exibidos = ordenados.slice(0, MAX_GRUPOS);
    const cortados = ordenados.length - exibidos.length;

    add(
      `${ordenados.length} tipos distintos, ${totalFindings} ocorrências no total.`,
      'Agrupados por tipo: um mesmo problema costuma se repetir em muitos arquivos ou rotas.',
      'Os caminhos são uma amostra — o número de caminhos distintos vem declarado em cada item.',
      '',
    );
    for (const g of exibidos) {
      const ident = [g.cve_id, g.cwe_id].filter(Boolean).join(' / ');
      add(`### ${g.severity} · ${g.title}`, '');
      add(
        `- Origem: ${sourceLabel(g.source)} · etapa ${g.tier}${ident ? ` · ${ident}` : ''}`,
        `- ${g.ocorrencias} ${g.ocorrencias === 1 ? 'ocorrência' : 'ocorrências'}` +
          ` em ${g.caminhos} ${g.caminhos === 1 ? 'caminho distinto' : 'caminhos distintos'}`,
      );
      if (g.asset) add(`- Ativo: ${g.asset}`);
      if (g.algum_secret_verificado) {
        add('- **Credencial confirmada como válida** — trate como exposta e rotacione');
      }
      const caminhos = (g.amostra ?? []).slice(0, MAX_CAMINHOS);
      if (caminhos.length) {
        add('- Onde:');
        for (const caminho of caminhos) add(`  - \`${caminho}\``);
        const restantes = g.caminhos - caminhos.length;
        if (restantes > 0) {
          add(`  - (mais ${restantes} ${restantes === 1 ? 'caminho' : 'caminhos'})`);
        }
      }
      add('');
    }
    if (cortados > 0) {
      add(
        '',
        `Outros ${cortados} tipos de menor severidade não foram incluídos neste arquivo.`,
      );
    }
    add('');
  }

  /* ── cobertura ───────────────────────────────────────────────────────────── */
  add('## Cobertura da análise', '');
  add(
    'O que cada etapa fez nesta execução. Etapa que não rodou não significa ausência de',
    'problema naquela dimensão — significa que ninguém olhou.',
    '',
  );
  TIER_META.forEach((meta, i) => {
    const etapas = tierToolRuns(job, i, { targetUrl, runs });
    add(`**${meta.name} — ${meta.desc}**`, '');
    for (const etapa of etapas) {
      const detalhes = [
        etapa.state === 'done' && etapa.findingsCount !== undefined
          ? `${etapa.findingsCount} achados`
          : null,
        etapa.reason,
      ].filter(Boolean);
      add(
        `- ${etapa.tool.name}: ${etapa.state}${detalhes.length ? ` (${detalhes.join(', ')})` : ''}`,
      );
    }
    add('');
  });

  add(
    '---',
    '',
    'Ao analisar: priorize o que é alcançável a partir da internet e o que aparece nos',
    'caminhos de ataque acima. Severidade isolada de um scanner não considera o contexto',
    'da aplicação, e um achado grave num trecho inalcançável pode importar menos que um',
    'achado médio numa rota exposta.',
    '',
  );

  return l.join('\n');
}
