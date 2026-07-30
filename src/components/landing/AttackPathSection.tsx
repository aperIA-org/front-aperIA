'use client';

import { useAttackPathProgress } from '@/hooks/useAttackPathProgress';
import { ATTACK_PATH_NODES } from '@/lib/landing/attack-path-nodes';
import { AttackPathNodeRow } from './AttackPathNode';
import { useAttackPathModal } from './AttackPathModalContext';
import { GradientText } from './GradientText';

export function AttackPathSection() {
  const { sectionRef, confidence, caption } = useAttackPathProgress();
  const { open } = useAttackPathModal();

  return (
    <section
      id="attack-path"
      data-landing-section
      data-attack-path
      ref={sectionRef}
      className="relative z-[1]"
    >
      {/* Em telas estreitas vira `block` (não `1fr`): o filho sticky precisa
          sair do contexto de grid, senão a coluna de texto fica grudada na
          viewport enquanto o trilho de 1560px rola por baixo. */}
      <div className="mx-auto block max-w-[1240px] px-8 py-[118px] min-[981px]:grid min-[981px]:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] min-[981px]:items-start min-[981px]:gap-[72px] max-[980px]:py-[60px]">
        {/* ── Coluna de texto ── */}
        <div className="mb-11 static min-[981px]:sticky min-[981px]:top-[100px] min-[981px]:mb-0">
          <h2 className="apr-rev mb-[18px] max-w-[480px] text-[clamp(30px,3.6vw,46px)] font-bold leading-[1.06] tracking-[-0.02em]">
            O caminho desce
            <br />
            e{'\u00A0'}se prova, <br />
            <GradientText className="font-normal">camada por camada.</GradientText>
          </h2>

          <p className="mb-8 max-w-[460px] text-[17px] leading-[1.6] text-ink-strong">
            Da entrada ao objetivo final :
            <br />
            Três tiers de profundidade crescente, cada hop validado antes de escalar
            para o próximo. Cada etapa indica o tipo de varredura, não a ferramenta.
          </p>

          <div className="font-heading text-[clamp(58px,7vw,88px)] font-extrabold leading-[0.85] tracking-[-0.03em] text-ink">
            {confidence}
            <span className="text-accent-bright">%</span>
          </div>

          <div className="mb-5 mt-2 h-[5px] max-w-[280px] overflow-hidden rounded-[4px] bg-surface-2">
            <div className="ap-progress-fill h-full rounded-[4px] bg-[image:linear-gradient(90deg,#e5333b,#ff4d54)]" />
          </div>

          <div className="inline-flex gap-2.5 font-mono text-[12.5px] text-ink-mute">
            {caption}
            <span
              className="text-accent-bright"
              style={{ animation: 'blink 1s steps(1) infinite' }}
            >
              _
            </span>
          </div>

          <div>
            <button
              type="button"
              onClick={open}
              className="mt-[26px] inline-flex cursor-pointer items-center gap-[9px] rounded-[7px] border border-[rgba(255,77,84,0.35)] bg-brand px-5 py-3 text-[14.5px] font-semibold text-white"
              style={{
                boxShadow:
                  '0 0 7px rgba(229,51,59,0.55), 0 14px 34px -14px rgba(229,51,59,0.6)',
              }}
            >
              <span
                className="h-[7px] w-[7px] rounded-full bg-white"
                style={{ animation: 'blink 1.4s steps(1) infinite' }}
              />
              Ver o caminho completo →
            </button>
          </div>
        </div>

        {/* ── Trilho ──
            A altura fixa de 1560px é intencional: os 14 nós são posicionados em
            `top` percentual sobre ela, e a matemática de `tops[]` depende disso. */}
        <div className="relative h-[1560px]">
          {/* trilho pontilhado */}
          <div
            className="absolute bottom-2 left-6 top-2 w-px -translate-x-1/2 opacity-50"
            style={{
              background:
                'repeating-linear-gradient(180deg, rgba(0,0,0,.16) 0 2px, transparent 2px 9px)',
            }}
          />
          {/* preenchimento vermelho, acompanha o progresso */}
          <div
            className="ap-rail-fill absolute left-6 top-[3%] w-px -translate-x-1/2"
            style={{
              background: 'linear-gradient(180deg, rgba(229,51,59,.35), #ff4d54)',
              boxShadow: '0 0 7px rgba(229,51,59,0.55)',
            }}
          />
          {/* marcador */}
          <div className="ap-marker absolute left-6 z-[6]">
            <span
              className="absolute left-1/2 top-1/2 h-px w-16 -translate-x-1/2 -translate-y-1/2"
              style={{
                background:
                  'linear-gradient(90deg, transparent, #ff4d54 45%, #ff4d54 55%, transparent)',
                boxShadow: '0 0 9px rgba(255,77,84,0.7)',
              }}
            />
            <span
              className="absolute left-1/2 top-1/2 h-[18px] w-[18px] rounded-full border border-[rgba(255,77,84,0.55)]"
              style={{ animation: 'markerRing 2.4s ease-out infinite' }}
            />
            <span
              className="relative block h-[7px] w-[7px] rounded-full bg-accent-bright"
              style={{ boxShadow: '0 0 10px 1px #ff4d54, 0 0 22px #e5333b' }}
            />
          </div>

          {ATTACK_PATH_NODES.map((node) => (
            <AttackPathNodeRow key={node.n} node={node} />
          ))}
        </div>
      </div>
    </section>
  );
}
