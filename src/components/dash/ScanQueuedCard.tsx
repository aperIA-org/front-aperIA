import {
  TIER_EXPECT,
  TIER_META,
  elapsedSince,
  scanRanAt,
  shortSha,
} from '@/lib/dash/format';
import { TIER_STATE_LABEL, tierState } from '@/lib/dash/pipeline-tools';
import type { ScanJob } from '@/lib/dash/types';
import { IconSpin } from './ScanPipeline';

/**
 * O scan acabou de ser disparado e nenhuma etapa produziu nada ainda.
 *
 * Em vez de uma tela de retângulos cinza, ela mostra o pipeline que **vai**
 * rodar: cada etapa com o seu estado, o SLA e o que ela faz. A espera fica
 * compreensível, que é a única coisa que a tela tem para oferecer nesse momento —
 * não existe resultado nenhum para mostrar.
 *
 * O tempo é o **decorrido**, nunca uma projeção: o pipeline não persiste
 * estimativa de conclusão, e "faltam ~28min" seria número inventado. O SLA por
 * etapa (`TIER_META[i].sla`) é característica do produto, não estimativa desta
 * execução — por isso pode ser afirmado.
 *
 * Substitui o card do pipeline enquanto durar: os dois lado a lado diriam a mesma
 * coisa duas vezes, e o trilho lateral cheio de traços é justamente o desenho que
 * este estado existe para evitar.
 */
function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="var(--ia)" width="11" height="11" aria-hidden="true">
      <path d="M13 2L4.5 13.5H10l-1 8.5 8.5-11.5H12l1-8.5z" />
    </svg>
  );
}

export function ScanQueuedCard({ job, now }: { job: ScanJob; now: number }) {
  const shortName = job.repo_full_name.split('/')[1] ?? job.repo_full_name;
  const decorrido = elapsedSince(scanRanAt(job), now);

  return (
    <div className="rep-card qc rep-mb">
      <div className="qc-hd">
        <IconSpin size={34} color="var(--run-strong)" />
        <div className="qc-hd-b">
          <div className="qc-hd-t1">
            <span className="qc-hd-nm">{shortName}</span>
            <span className="qc-hd-sha">commit {shortSha(job.commit_sha)}</span>
          </div>
          <p className="qc-hd-tx">
            {decorrido ? `Scan iniciado há ${decorrido} · ` : ''}os resultados aparecem à
            medida que cada etapa conclui
          </p>
        </div>
      </div>

      <div className="qc-rail">
        {[0, 1, 2].map((index) => {
          const state = tierState(job, index);
          const isIa = index === 2;
          const meta = TIER_META[index];
          const ultimo = index === 2;

          return (
            <Tier
              key={meta.name}
              isIa={isIa}
              ultimo={ultimo}
              running={state === 'running'}
              nome={`${meta.name} · ${meta.desc}`}
              meta={`${TIER_STATE_LABEL[state]} · ${meta.sla}`}
              texto={TIER_EXPECT[index]}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Uma etapa: célula do rail + card. Duas células por linha da grade. */
function Tier({
  isIa,
  ultimo,
  running,
  nome,
  meta,
  texto,
}: {
  isIa: boolean;
  ultimo: boolean;
  running: boolean;
  nome: string;
  meta: string;
  texto: string;
}) {
  return (
    <>
      <div className="qc-rail-c">
        {running ? (
          <span className="qc-node" data-s="running">
            <IconSpin size={22} color="var(--run-strong)" />
          </span>
        ) : (
          <span className={`qc-node${isIa ? ' is-ia' : ''}`} data-s="queued" />
        )}
        {/* A linha morre no último nó. */}
        {!ultimo && <span className="qc-rail-line" data-on={running ? 'true' : 'false'} />}
      </div>

      <div
        className={`qc-tier${isIa ? ' is-ia' : ''}`}
        data-s={running ? 'running' : 'queued'}
      >
        <div className="qc-tier-t1">
          {isIa && (
            <span className="qc-tier-ico">
              <IconBolt />
            </span>
          )}
          <span className="qc-tier-nm">{nome}</span>
          <span className="qc-tier-meta">{meta}</span>
        </div>
        <p className="qc-tier-tx">{texto}</p>
      </div>
    </>
  );
}
