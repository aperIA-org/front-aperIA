import Link from 'next/link';
import {
  RISK_LEVEL_PT,
  SEV_COLORS,
  elapsedSince,
  fmtAbs,
  riskColor,
  riskMax,
  scanRanAt,
  severityCounts,
  shortSha,
  tierStartedAt,
  timeAgo,
} from '@/lib/dash/format';
import { SCREEN_ROUTES, type ReportOrigin } from '@/lib/dash/dash-routes';
import { SKIP_REASON_LONG, tierSkipReason } from '@/lib/dash/pipeline-tools';
import { pipeStatus } from '@/lib/dash/scan-state';
import type { ScanJob } from '@/lib/dash/types';
import { IconSpin } from './ScanPipeline';

/**
 * Cabeçalho do detalhe de uma execução: risco, identidade, estado e a faixa de
 * indicadores.
 *
 * Ele é renderizado com o dado de `GET /scans/{id}` — uma requisição só, e a
 * primeira a resolver. É por isso que ele **não** fica atrás de `<Suspense>`:
 * quem abre a tela vê imediatamente de que repositório e de que commit se trata,
 * enquanto relatório, pipeline e findings ainda estão a caminho.
 *
 * Os dois indicadores que dependem da leitura executiva do Tier 3 entram por
 * `iaTiles`, justamente para poderem chegar depois sem segurar o resto.
 */

/** Tudo o que o cabeçalho precisa saber sobre o conjunto de findings. */
export type FindingsHeadline = {
  /** `null` = ninguém contou (a API não respondeu). Diferente de zero. */
  total: number | null;
  bySeverity?: Record<string, number>;
};

function IconChevronLeft() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/**
 * A trilha: de onde se veio, qual repositório, qual commit.
 *
 * O primeiro nível segue a ORIGEM (`?de=`), não a hierarquia da URL. Quem chega
 * pelo "Ver relatório completo" de um card de Scans espera voltar para Scans; se
 * a trilha o mandasse para Relatórios ele cairia numa terceira tela, que tem as
 * mesmas execuções em outra apresentação e que ele nunca abriu. Sem o parâmetro
 * o padrão é Relatórios, que é o índice desta rota.
 */
function Crumb({ job, origem }: { job: ScanJob; origem: ReportOrigin }) {
  const volta =
    origem === 'scans'
      ? { href: SCREEN_ROUTES.pipelines, label: 'Scans' }
      : { href: SCREEN_ROUTES.reports, label: 'Relatórios' };

  return (
    <nav className="rep-crumb" aria-label="Trilha de navegação">
      <Link href={volta.href} className="inline-flex items-center gap-1.5">
        <IconChevronLeft />
        {volta.label}
      </Link>
      <span className="rep-crumb-sep" aria-hidden="true">
        /
      </span>
      <span className="truncate">{job.repo_full_name}</span>
      <span className="rep-crumb-sep" aria-hidden="true">
        /
      </span>
      <span className="rep-crumb-sha">{shortSha(job.commit_sha)}</span>
    </nav>
  );
}

/** Um tile da faixa. `wait` marca o valor que ainda não existe. */
export function KpiTile({
  label,
  children,
  wait = false,
}: {
  label: string;
  children: React.ReactNode;
  wait?: boolean;
}) {
  return (
    <div>
      <div className="rep-kpi-lb">{label}</div>
      <div className="rep-kpi-vl" data-wait={wait ? 'true' : undefined}>
        {children}
      </div>
    </div>
  );
}

/** Placeholder de um tile enquanto a leitura executiva não chegou. */
export function KpiTileSkeleton({ label }: { label: string }) {
  return (
    <div>
      <div className="rep-kpi-lb">{label}</div>
      <span className="skel" style={{ width: 88, height: 15, marginTop: 2 }} />
    </div>
  );
}

export function ReportHeader({
  job,
  findings,
  demo,
  now,
  origem = 'reports',
  iaTiles,
  acoes,
}: {
  job: ScanJob;
  findings: FindingsHeadline;
  demo: boolean;
  now: number;
  /** De onde o usuário veio, para o "voltar" da trilha. */
  origem?: ReportOrigin;
  /** Os tiles de esforço e prazo — vêm de `ia`, então podem chegar depois. */
  iaTiles: React.ReactNode;
  /** Ações sobre a execução inteira. Depende de `ia`, então chega por Suspense. */
  acoes?: React.ReactNode;
}) {
  const max = riskMax(demo);
  const tiers = [job.tier1_status, job.tier2_status, job.tier3_status];
  /*
   * `pipeStatus`, e NÃO `tiers.includes('running')`.
   *
   * Entre o fim de um tier e o início do seguinte nenhum deles está `running`,
   * mas o pipeline está andando — e a versão ingênua fazia esta tela cair no
   * ramo de concluído no meio da execução. É a mesma função da lista de Scans,
   * de propósito: as duas telas mostram a mesma execução.
   */
  const status = pipeStatus(job);
  const running = status === 'running';
  const t3Done = job.tier3_status === 'done';
  const gate1Blocked = job.final_risk_level === 'blocked';
  // Tier 3 pulado pelo Gate 2 é um desfecho, não uma pendência.
  const noEscalation = tierSkipReason(job, 2) === 'gate2-sem-escalada';

  const shortName = job.repo_full_name.split('/')[1] ?? job.repo_full_name;
  const severidades = severityCounts(findings.bySeverity);
  const pior = severidades[0];

  /*
   * Tempo decorrido da etapa em execução — sem projetar o fim. O pipeline não
   * persiste estimativa nenhuma, então "faltam ~28min" seria número inventado;
   * o que se sabe é quanto já passou, e o SLA da etapa aparece no pipeline.
   */
  const tierRodando = tiers.findIndex((st) => st === 'running');
  // Na janela entre dois tiers não há tier `running` para cronometrar, e aí o
  // que se sabe é desde quando a EXECUÇÃO roda — que é verdade nos dois casos.
  const inicio =
    tierRodando >= 0 ? tierStartedAt(job, tierRodando) : running ? scanRanAt(job) : null;
  const decorrido = inicio ? elapsedSince(inicio, now) : null;

  return (
    <>
      <div className="rep-topbar">
        <Crumb job={job} origem={origem} />
        {acoes ? <div className="rep-topbar-acoes">{acoes}</div> : null}
      </div>

      <div className="rep-card rep-hd rep-mb">
        <div className="rep-hd-top">
          <div className="rep-score">
            <div
              className="rep-score-n"
              style={{
                color:
                  job.final_risk_score !== null
                    ? riskColor(job.final_risk_score, max)
                    : 'var(--run)',
              }}
            >
              {/* Em execução o risco ainda não existe: "—" e não um zero, que
                  leria como "risco nenhum". */}
              {job.final_risk_score ?? '—'}
            </div>
            <div className="rep-score-max">/{max}</div>
          </div>

          <div className="rep-hd-div" aria-hidden="true" />

          <div className="rep-hd-body">
            <div className="rep-hd-t1">
              <span className="rep-hd-nm">{shortName}</span>
              {/* Os MESMOS selos da lista de Scans (`.sev st-*`), com o mesmo
                  texto: quem clicou em "ver relatório" tem que reconhecer o
                  estado que acabou de ler. Uma pílula própria aqui obrigava a
                  traduzir "análise em andamento" para "em execução". */}
              {running ? (
                <span className="sev st-running" style={{ gap: 5 }}>
                  <IconSpin size={10} color="#3b82f6" />
                  em execução
                </span>
              ) : status === 'done' ? (
                <span className="sev st-done">concluído</span>
              ) : status === 'failed' ? (
                <span className="sev st-failed">falhou</span>
              ) : null}
              {gate1Blocked && <span className="sev st-blocked">gate1 bloqueado</span>}
              {noEscalation && (
                <span
                  className="sev st-nogate"
                  title={SKIP_REASON_LONG['gate2-sem-escalada']}
                >
                  tier 3 dispensado
                </span>
              )}
            </div>
            <div className="rep-hd-sub">
              {running && !t3Done ? (
                <>
                  {findings.total !== null ? (
                    <>
                      <b>{findings.total}</b>{' '}
                      {findings.total === 1 ? 'finding' : 'findings'} já{' '}
                      {findings.total === 1 ? 'identificado' : 'identificados'} ·{' '}
                    </>
                  ) : null}
                  o risco final e os caminhos de ataque saem com o Tier 3
                </>
              ) : (
                <>
                  {/* `pr_number = 0` é o scan manual: roda pelo botão, fora de um PR. */}
                  {job.pr_number ? `PR #${job.pr_number}` : 'scan manual'} ·{' '}
                  <span title={fmtAbs(scanRanAt(job))} className="cursor-help">
                    rodou {timeAgo(scanRanAt(job), now)}
                  </span>
                  {findings.total !== null ? (
                    <>
                      {' '}
                      · {findings.total} {findings.total === 1 ? 'finding' : 'findings'}
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {decorrido && (
            <div className="rep-hd-right">
              <span className="rep-hd-el">rodando há {decorrido}</span>
            </div>
          )}
        </div>

        <div className="rep-kpi">
          <KpiTile
            label="Nível de risco"
            wait={job.final_risk_level === null}
          >
            {job.final_risk_level ? (
              <span
                style={{
                  /* `blocked` normalmente vem SEM score (o Gate 1 interrompeu o
                     pipeline), e `riskColor(0)` é verde — o oposto do que
                     "bloqueado" significa. Ele tem cor própria. */
                  color:
                    job.final_risk_level === 'blocked'
                      ? SEV_COLORS.critical
                      : riskColor(job.final_risk_score ?? 0, max),
                }}
              >
                {RISK_LEVEL_PT[job.final_risk_level]}
              </span>
            ) : running ? (
              <>
                <IconSpin size={12} color="var(--run)" />
                calculando…
              </>
            ) : (
              /* Não é "risco zero": o pipeline não registrou nível nesta
                 execução, e dizer "baixo" aqui seria inventar o resultado. */
              'não calculado'
            )}
          </KpiTile>

          <KpiTile
            label="Findings"
            wait={findings.total === null || (findings.total === 0 && running)}
          >
            {findings.total === null ? (
              'não foi possível contar'
            ) : findings.total === 0 && running ? (
              /* Zero DURANTE a execução não é "limpo": é "ainda nenhum". No fim
                 do scan o mesmo zero é um resultado, e aí ele aparece como
                 número. Mostrar "0" nos dois casos daria o veredito antes da
                 hora. */
              'nenhum ainda'
            ) : (
              <>
                {findings.total}
                {pior ? <span className="un">· {pior.count} {pior.severity}</span> : null}
              </>
            )}
          </KpiTile>

          {iaTiles}
        </div>
      </div>
    </>
  );
}
