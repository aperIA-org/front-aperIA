import type { ScanIaSummary } from '@/lib/dash/pipeline-tools';
import { TIER_META, elapsedSince, tierStartedAt } from '@/lib/dash/format';
import { isJobRunning } from '@/lib/dash/scan-state';
import type { ScanJob } from '@/lib/dash/types';
import { IconSpin } from './ScanPipeline';
import { KpiTile } from './ReportHeader';

/**
 * **Impacto ao negócio** — a tradução do risco técnico para quem decide.
 *
 * Vem de `business_impact` no `analysis_json` do Tier 3, compactado pela API em
 * `ia.impact`. O prompt é instruído a escrever isto **sem jargão** (sem CVE, sem
 * TTP, sem nome de ferramenta), porque o público é quem aprova o merge — e por
 * isso nada aqui é derivado na tela: reescrever o texto em termos técnicos
 * desfaria justamente a tradução.
 *
 * Três estados, e eles dizem coisas **diferentes** — confundi-los é o erro que
 * esta tela tem que evitar:
 *
 * - `wait`: o pipeline está andando. Não existe leitura ainda porque ela depende
 *   da simulação de attack path do Tier 3.
 * - `none`: ninguém traduziu. Relatório gerado antes de o pipeline emitir esses
 *   campos, ou execução em que o Claude não respondeu (`degraded`). **Não** é
 *   "nada a fazer": é ausência de leitura.
 * - `ready`: veio do pipeline.
 *
 * A `recommendation` do veredito é um enum curto exatamente para a tela poder
 * colorir por ela; procurar a decisão dentro da frase seria frágil.
 */

/** Recomendações que a UI sabe colorir. Outra qualquer aparece sem cor. */
const RECOMENDACOES = ['bloquear', 'corrigir', 'monitorar'] as const;

/** O rótulo da área, em maiúsculas. Área nova aparece com o id cru. */
const AREA_PT: Record<string, string> = {
  dados: 'dados',
  propriedade_intelectual: 'propriedade intelectual',
  entrega: 'entrega',
  financeiro: 'financeiro',
  reputacao: 'reputação',
  regulatorio: 'regulatório',
  operacao: 'operação',
};

/** Severidades que o CSS colore; qualquer outra cai no cinza neutro. */
const SEVERIDADES = ['critico', 'alto', 'medio', 'baixo'] as const;

function recKnown(value: string | null): string | undefined {
  return value && (RECOMENDACOES as readonly string[]).includes(value) ? value : undefined;
}

function sevKnown(value: string | null): string | undefined {
  return value && (SEVERIDADES as readonly string[]).includes(value) ? value : undefined;
}

function IconImpact() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--sev-critical)"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l9 9-9 9-9-9 9-9z" />
      <path d="M12 8.5v4M12 15.5h.01" />
    </svg>
  );
}

function IconEmpty() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-dim)"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

/** Um dos três blocos da faixa de consequências. */
function Note({
  kind,
  label,
  note,
}: {
  kind: 'now' | 'later' | 'reg';
  label: string;
  note: { headline: string | null; detail: string | null };
}) {
  return (
    <div className="imp-note" data-k={kind}>
      <div className="imp-note-lb">{label}</div>
      <div className="imp-note-vl">{note.headline ?? '—'}</div>
      {note.detail ? <div className="imp-note-tx">{note.detail}</div> : null}
    </div>
  );
}

export function ReportImpact({
  job,
  ia,
  now,
}: {
  job: ScanJob;
  /** `null` = sem relatório de Tier 3 / demonstração. */
  ia: ScanIaSummary | null;
  now: number;
}) {
  const impact = ia?.impact ?? null;
  const verdict = ia?.verdict ?? null;
  const temImpacto =
    !!impact &&
    (!!impact.headline ||
      impact.areas.length > 0 ||
      !!impact.if_fixed_now ||
      !!impact.if_deferred ||
      !!impact.regulatory);

  if (temImpacto && impact) {
    const rec = recKnown(verdict?.recommendation ?? null);
    return (
      <div className="rep-card imp rep-mb">
        <div className="imp-hd">
          <span className="imp-ico">
            <IconImpact />
          </span>
          <span className="imp-nm">Impacto ao negócio</span>
          <span className="imp-kicker">tradução do risco técnico</span>
        </div>

        {impact.headline ? (
          <div className="imp-one">
            <div className="imp-one-lb">em uma frase</div>
            <p className="imp-one-tx">{impact.headline}</p>
          </div>
        ) : null}

        {impact.areas.length > 0 ? (
          <div className="imp-areas">
            {impact.areas.map((area, i) => (
              <div
                key={`${area.area ?? 'area'}-${i}`}
                className="imp-area"
                data-sev={sevKnown(area.severity)}
              >
                <div className="imp-area-hd">
                  {/* Área que o catálogo daqui não conhece entra com o id cru:
                      sumir com o efeito seria pior que mostrar um rótulo feio. */}
                  <span className="imp-area-tag">
                    {area.area ? (AREA_PT[area.area] ?? area.area.replace(/_/g, ' ')) : 'impacto'}
                  </span>
                  {area.severity ? (
                    <span className="imp-area-sev">{area.severity}</span>
                  ) : null}
                </div>
                {area.title ? <div className="imp-area-nm">{area.title}</div> : null}
                {area.detail ? <p className="imp-area-tx">{area.detail}</p> : null}
              </div>
            ))}
          </div>
        ) : null}

        {impact.if_fixed_now || impact.if_deferred || impact.regulatory ? (
          <div className="imp-notes">
            {impact.if_fixed_now && (
              <Note kind="now" label="Se corrigir agora" note={impact.if_fixed_now} />
            )}
            {impact.if_deferred && (
              <Note kind="later" label="Se postergar" note={impact.if_deferred} />
            )}
            {impact.regulatory && (
              <Note kind="reg" label="Exposição regulatória" note={impact.regulatory} />
            )}
          </div>
        ) : null}

        {/* A recomendação do pipeline. Deliberadamente NÃO é um botão: não existe
            rota para bloquear merge nem para atribuir responsável, e um botão que
            não faz o que diz é pior que a ausência dele. */}
        {verdict?.recommendation || verdict?.headline ? (
          <div className="imp-ft">
            <span className="imp-ft-lb">Recomendação do pipeline:</span>
            {verdict.recommendation ? (
              <span className="rep-rec" data-r={rec}>
                {verdict.recommendation}
              </span>
            ) : null}
            {verdict.headline ? (
              <span className="imp-ft-lb" style={{ minWidth: 0 }}>
                {verdict.headline}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  /*
   * O pipeline está andando — inclusive na janela entre dois tiers, em que
   * nenhum deles está `running`. A leitura sai com o Tier 3, e até lá o certo é
   * "em preparação", não "ninguém traduziu".
   */
  if (isJobRunning(job)) {
    const inicio = tierStartedAt(job, 2);
    const decorrido = inicio ? elapsedSince(inicio, now) : null;
    return (
      <div className="rep-verd" data-s="wait">
        <span className="rep-verd-ico">
          <IconSpin size={20} color="var(--run)" />
        </span>
        <div className="rep-verd-b">
          <div className="rep-verd-tl">Impacto ao negócio em preparação</div>
          <p className="rep-verd-tx">
            A tradução para o negócio depende da simulação de attack path — sai junto
            com o Tier 3
            {decorrido ? `, que roda há ${decorrido}` : ', que ainda não começou'}. O
            SLA da etapa é {TIER_META[2].sla}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rep-verd" data-s="none">
      <span className="rep-verd-ico">
        <IconEmpty />
      </span>
      <div className="rep-verd-b">
        <div className="rep-verd-tl">Sem leitura de impacto ao negócio</div>
        <p className="rep-verd-tx">
          {ia?.degraded
            ? 'O Tier 3 fechou em modo degradado nesta execução — a tradução depende do modelo, que não respondeu. Os achados das ferramentas continuam válidos.'
            : 'Esta execução não tem tradução para o negócio: ou o Tier 3 não gerou relatório, ou ela é anterior à versão do pipeline que passou a produzi-la.'}{' '}
          Isso <b>não</b> quer dizer que não há risco — quer dizer que ninguém
          concluiu por você.
        </p>
      </div>
    </div>
  );
}

/**
 * Os dois indicadores da faixa que dependem da leitura executiva.
 *
 * Separados do card porque moram em outro lugar da tela (dentro do cabeçalho),
 * mas vêm da mesma requisição — daí ficarem no mesmo módulo.
 */
export function ReportIaTiles({ job, ia }: { job: ScanJob; ia: ScanIaSummary | null }) {
  /* Em execução a frase é "sai com o Tier 3"; parado é "não calculado". As duas
     são ausência, mas só uma delas vai virar valor sozinha — e a diferença tem
     que valer para o pipeline inteiro, não só para o Tier 3, senão a janela
     entre dois tiers já anuncia "não calculado". */
  const espera = isJobRunning(job) ? 'sai com o Tier 3' : 'não calculado';

  const effort = ia?.effort ?? null;
  const deadline = ia?.deadline ?? null;

  return (
    <>
      <KpiTile label="Esforço de correção" wait={!effort}>
        {effort ? (
          <>
            {effort.level ?? '—'}
            {effort.label ? <span className="un">· {effort.label}</span> : null}
          </>
        ) : (
          espera
        )}
      </KpiTile>

      <KpiTile label="Prazo recomendado" wait={!deadline}>
        {deadline ? (
          deadline.label ??
          (deadline.days !== null
            ? `${deadline.days} ${deadline.days === 1 ? 'dia' : 'dias'}`
            : espera)
        ) : (
          espera
        )}
      </KpiTile>
    </>
  );
}
