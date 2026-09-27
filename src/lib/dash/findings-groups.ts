import {
  agingWindow,
  type FindingsFilters,
  type SortColumn,
  type SortDir,
} from './findings-filters';
import { SEV_ORDER } from './format';
import { cweClass } from './mock-data';
import type { Finding, FindingGroup } from './types';
import type { SevCounts } from '@/components/dash/SevDonut';

/**
 * Agrupamento de findings por TIPO de vulnerabilidade — o mesmo que
 * `GET /findings/groups` faz no servidor, só que sobre um array em memória.
 *
 * Este módulo é PURO (sem `server-only`) de propósito: é ele que faz o modo
 * demonstração funcionar. O dataset do protótipo não passa pela API, então a
 * tela precisa agrupar do lado de cá — e o resultado tem que ter exatamente a
 * mesma forma que a API devolve, senão a `FindingsScreen` precisaria de dois
 * caminhos de renderização.
 *
 * A chave e a ordenação são as do servidor: `source + severity + tier + title
 * + asset`, ordenado por severidade desc e depois por volume desc.
 */

/** Quantos caminhos de exemplo por grupo — igual ao `amostra` pedido à API. */
const AMOSTRA_PADRAO = 8;

/** Rótulo do caminho quando o detector não reporta arquivo (idem servidor). */
const SEM_CAMINHO = '(sem caminho)';

/**
 * Identidade de um grupo, para `key` de React, para o estado de expansão e
 * para agrupar o dataset do protótipo.
 *
 * São os **sete** campos do `GROUP BY` do servidor. Já foram cinco, e a
 * divergência era real: dois alertas de mesmo título com CWE diferente são
 * grupos distintos na API e colapsariam num só aqui. O título sozinho também
 * não serve — o mesmo alerta aparece em repositórios e severidades diferentes.
 */
export function groupKey(
  group: Pick<
    FindingGroup,
    'source' | 'severity' | 'tier' | 'title' | 'cve_id' | 'cwe_id' | 'asset'
  >,
): string {
  return [
    group.source,
    group.severity,
    group.tier,
    group.title,
    group.cve_id ?? '',
    group.cwe_id ?? '',
    group.asset ?? '',
  ].join('|');
}

/** Caminho exibido na amostra: `arquivo:linha`, no formato do servidor. */
function caminhoDe(finding: Finding): string {
  const arquivo = finding.file_path || SEM_CAMINHO;
  return finding.line_number ? `${arquivo}:${finding.line_number}` : arquivo;
}

export function groupFindings(
  findings: Finding[],
  amostraPorGrupo: number = AMOSTRA_PADRAO,
): FindingGroup[] {
  const buckets = new Map<string, Finding[]>();

  for (const finding of findings) {
    const chave = groupKey({
      source: finding.source,
      severity: finding.severity,
      tier: finding.tier,
      title: finding.title,
      cve_id: finding.cve_id,
      cwe_id: finding.cwe_id,
      asset: finding.asset || null,
    });
    const atual = buckets.get(chave);
    if (atual) atual.push(finding);
    else buckets.set(chave, [finding]);
  }

  const grupos: FindingGroup[] = [];

  for (const ocorrencias of buckets.values()) {
    // Mesma ordem do `row_number()` do servidor: caminho, depois linha. É ela
    // que define qual finding vira o exemplo e quais caminhos entram na amostra.
    const ordenadas = ocorrencias
      .slice()
      .sort(
        (a, b) =>
          (a.file_path || '').localeCompare(b.file_path || '') ||
          a.line_number - b.line_number,
      );

    const primeira = ordenadas[0];
    const datas = ordenadas.map((f) => new Date(f.created_at).getTime());
    // `count(distinct file_path)` do servidor ignora NULL; aqui o equivalente
    // de NULL é a string vazia, então ela também não conta como caminho.
    const caminhos = new Set(ordenadas.map((f) => f.file_path).filter(Boolean));

    grupos.push({
      source: primeira.source,
      severity: primeira.severity,
      tier: primeira.tier,
      title: primeira.title,
      // Fazem parte da chave, então são iguais em todo o grupo.
      cve_id: primeira.cve_id,
      cwe_id: primeira.cwe_id,
      asset: primeira.asset || null,
      ocorrencias: ordenadas.length,
      caminhos: caminhos.size,
      algum_secret_verificado: ordenadas.some((f) => f.secret_verified),
      primeiro_em: new Date(Math.min(...datas)).toISOString(),
      ultimo_em: new Date(Math.max(...datas)).toISOString(),
      exemplo_finding_id: primeira.id,
      amostra: ordenadas.slice(0, Math.max(1, amostraPorGrupo)).map(caminhoDe),
    });
  }

  // Ordem do servidor: severidade desc, depois volume desc.
  return grupos.sort(
    (a, b) =>
      (SEV_ORDER[b.severity] ?? 0) - (SEV_ORDER[a.severity] ?? 0) ||
      b.ocorrencias - a.ocorrencias,
  );
}

/** `true` quando o intervalo do grupo cruza a janela `[de, ate]`. */
function intersecta(
  group: FindingGroup,
  de: number,
  ate: number,
): boolean {
  const primeiro = new Date(group.primeiro_em).getTime();
  const ultimo = new Date(group.ultimo_em).getTime();
  return ultimo >= de && primeiro <= ate;
}

/**
 * Os mesmos filtros da tela, aplicados a grupos.
 *
 * Severidade, scanner, tier, repositório, categoria e o título do drill-down
 * são propriedades do próprio grupo — filtram direto. Período e aging não:
 * um grupo não tem uma data, tem um INTERVALO (`primeiro_em`…`ultimo_em`), que
 * pode atravessar várias faixas. Então esses dois viram interseção de
 * intervalos — o grupo entra se qualquer ocorrência dele *pode* estar na
 * janela.
 *
 * A busca livre é a única que perde alcance aqui: na lista plana ela também
 * compara `file_path`, mas o caminho é por ocorrência e o grupo só conhece a
 * amostra. Comparar contra a amostra daria falso negativo silencioso (o
 * arquivo existe, mas não está nos 8 primeiros), então a busca agrupada
 * compara o que o grupo de fato é — título, CVE, CWE e repositório — e a tela
 * avisa que a busca por arquivo mora na visão "Todos".
 */
export function applyScopeToGroups(
  filters: FindingsFilters,
  groups: FindingGroup[],
  now: number,
): FindingGroup[] {
  let scope = groups.slice();

  if (filters.titulo) scope = scope.filter((g) => g.title === filters.titulo);
  if (filters.repositorios.length)
    scope = scope.filter((g) => filters.repositorios.includes(g.asset ?? ''));
  if (filters.categorias.length)
    scope = scope.filter((g) => filters.categorias.includes(cweClass(g)));
  if (filters.severidades.length)
    scope = scope.filter((g) => filters.severidades.includes(g.severity));
  if (filters.scanners.length)
    scope = scope.filter((g) => filters.scanners.includes(g.source));
  if (filters.tiers.length) scope = scope.filter((g) => filters.tiers.includes(g.tier));

  if (filters.faixaAging.length) {
    const janelas = filters.faixaAging.map((faixa) => agingWindow(faixa, now));
    scope = scope.filter((g) => janelas.some((j) => intersecta(g, j.de, j.ate)));
  }

  if (filters.periodo.de !== null || filters.periodo.ate !== null) {
    const de = filters.periodo.de ?? -Infinity;
    const ate = filters.periodo.ate ?? Infinity;
    scope = scope.filter((g) => intersecta(g, de, ate));
  }

  if (filters.busca) {
    const q = filters.busca.toLowerCase();
    scope = scope.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        (g.cve_id || '').toLowerCase().includes(q) ||
        (g.cwe_id || '').toLowerCase().includes(q) ||
        (g.asset || '').toLowerCase().includes(q),
    );
  }

  return scope;
}

/**
 * Ordena grupos pelas mesmas colunas da lista plana.
 *
 * O volume é sempre o critério de desempate, em qualquer coluna: é o que a
 * ordem da API faz e é o que mantém o problema de 3.007 ocorrências acima do
 * de 2, dentro da mesma severidade.
 */
export function sortGroups(
  groups: FindingGroup[],
  sort: { col: SortColumn; dir: SortDir },
): FindingGroup[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return groups.slice().sort((a, b) => {
    let av: number;
    let bv: number;
    if (sort.col === 'tier') {
      av = a.tier;
      bv = b.tier;
    } else if (sort.col === 'when') {
      av = new Date(a.ultimo_em).getTime();
      bv = new Date(b.ultimo_em).getTime();
    } else {
      av = SEV_ORDER[a.severity] ?? 0;
      bv = SEV_ORDER[b.severity] ?? 0;
    }
    return (av - bv) * dir || b.ocorrencias - a.ocorrencias;
  });
}

/**
 * Contagem por severidade somando as OCORRÊNCIAS de cada grupo.
 *
 * A home contava `findings.length`, e `fetchFindings` para em 1000 — com DAST
 * ligado um único scan grava ~12 mil findings, então os KPIs travavam em 1000 e
 * a escada de severidade ficava com a proporção errada. Aqui não há teto: cada
 * grupo já traz quantas vezes o problema aparece.
 */
export function contarSeveridades(groups: FindingGroup[]): SevCounts {
  const counts: SevCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const g of groups) {
    if (g.severity in counts) counts[g.severity as keyof SevCounts] += g.ocorrencias;
  }
  return counts;
}
