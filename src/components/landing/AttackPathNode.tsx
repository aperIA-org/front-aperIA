import type { CSSProperties } from 'react';
import type { AttackPathNode as Node } from '@/lib/landing/attack-path-nodes';
import { AttackPathGoalCard } from './AttackPathGoalCard';

const GUTTER_CLASS =
  'relative flex w-12 flex-shrink-0 items-center justify-center';

const CARD_CLASS =
  'ap-lit ap-pop relative flex-1 max-w-[352px] rounded-xl border border-black/[0.09] bg-panel px-[15px] py-2.5';

/** `--top` alimenta o `calc()` de `--L` em globals.css. */
function rowStyle(node: Node): CSSProperties {
  return { top: `${node.top}%`, '--top': node.top } as CSSProperties;
}

function CircleGlyph() {
  return (
    <>
      <span className="ap-act absolute h-[30px] w-[30px] rounded-full border border-accent-bright" />
      <span className="relative h-[13px] w-[13px] rounded-full border border-paper-line bg-surface-2" />
      <span
        className="ap-glow absolute h-[13px] w-[13px] rounded-full bg-accent-bright"
        style={{ boxShadow: '0 0 12px #ff4d54' }}
      />
    </>
  );
}

function DiamondGlyph() {
  return (
    <>
      <span className="ap-act absolute h-[26px] w-[26px] rotate-45 border border-accent-bright" />
      <span className="relative h-3 w-3 rotate-45 border border-accent bg-surface-2" />
      <span
        className="ap-glow absolute h-3 w-3 rotate-45 bg-accent-bright"
        style={{ boxShadow: '0 0 14px #ff4d54' }}
      />
    </>
  );
}

export function AttackPathNodeRow({ node }: { node: Node }) {
  const rowBase =
    'ap-node absolute left-0 flex w-full -translate-y-1/2 items-center gap-4';

  if (node.kind === 'tier') {
    return (
      <div className={`${rowBase} ap-lit`} style={rowStyle(node)}>
        <div className={GUTTER_CLASS}>
          <span className="ap-glow font-mono text-xs text-accent-bright">▼</span>
        </div>
        <div className="flex-1 border-l-2 border-accent py-[3px] pl-[14px]">
          <span className="font-mono text-[12.5px] font-semibold tracking-[0.06em] text-ink">
            {node.label}
          </span>
        </div>
      </div>
    );
  }

  if (node.kind === 'diamond') {
    return (
      <div className={`${rowBase} ap-lit`} style={rowStyle(node)}>
        <div className={GUTTER_CLASS}>
          <DiamondGlyph />
        </div>
        <div className="flex-1" />
      </div>
    );
  }

  if (node.kind === 'goal') {
    return (
      <div className={rowBase} style={rowStyle(node)}>
        <div className={GUTTER_CLASS}>
          <span className="ap-act absolute h-10 w-10 rounded-full border border-accent-bright" />
          <span
            className="ap-glow relative flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-accent-bright"
            style={{ boxShadow: '0 0 16px #ff4d54' }}
          >
            <span className="h-2 w-2 rounded-full bg-accent-bright" />
          </span>
        </div>
        <AttackPathGoalCard />
      </div>
    );
  }

  return (
    <div className={rowBase} style={rowStyle(node)}>
      <div className={GUTTER_CLASS}>
        <CircleGlyph />
      </div>
      <div className={CARD_CLASS}>
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-heading text-base font-bold leading-[1.05] text-ink">
              {node.title}
            </div>
            <div className="mt-1.5 text-[10px] leading-[1.55] tracking-[0.015em] text-ink-dim opacity-60">
              {node.scope}
            </div>
            <div className="mt-1.5 text-[10px] leading-[1.55] tracking-[0.015em] text-ink-dim">
              Obtém:{' '}
              <span className="font-semibold" style={{ color: node.gainColor }}>
                {node.gain}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
