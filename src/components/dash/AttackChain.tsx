'use client';

import Link from 'next/link';
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { SCREEN_ROUTES } from '@/lib/dash/dash-routes';
import { sevColor } from '@/lib/dash/format';
import { FINDINGS } from '@/lib/dash/mock-data';
import type { AttackStep } from '@/lib/dash/types';
import { SevBadge } from './SevBadge';

/**
 * Rótulos das táticas MITRE ATT&CK (`AP_PHASES` do protótipo). Fica aqui porque
 * só a cadeia de ataque usa — se outra tela precisar, vale mover para
 * `@/lib/dash/mock-data`.
 */
const AP_PHASES: Record<string, string> = {
  initial_access: 'Initial Access',
  execution: 'Execution',
  persistence: 'Persistence',
  privilege_escalation: 'Privilege Escalation',
  defense_evasion: 'Defense Evasion',
  credential_access: 'Credential Access',
  discovery: 'Discovery',
  lateral_movement: 'Lateral Movement',
  collection: 'Collection',
  exfiltration: 'Exfiltration',
  impact: 'Impact',
  reconnaissance: 'Reconnaissance',
};

/** Ritmo da narrativa, igual ao `playAttackChain` original. */
const STEP_MS = 1200;
const CONN_MS = 550;
const TAIL_MS = 500;

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Cadeia de ataque com revelação sequencial.
 *
 * O CSS da animação (`.ap-step.lit`, `#ap-chain.animate`, `.ap-conn.filled`)
 * é o mesmo do protótipo e vive em `dash.css` — daí o `id="ap-chain"` e os
 * nomes de classe serem preservados. O que era manipulação de classe via
 * `setTimeout` global virou estado: `revealed` = quantos passos estão acesos,
 * `connected` = quantos conectores já preencheram.
 *
 * O estado inicial reproduz o markup do protótipo (nenhum passo com `lit`):
 * sem a classe `animate` no container, o CSS não escurece nada, então a cadeia
 * já nasce legível — só os conectores ficam vazios até a narrativa rodar. Se
 * o estado inicial fosse "tudo aceso", todos os anéis pulsariam no load.
 */
export function AttackChain({ steps }: { steps: AttackStep[] }) {
  const total = steps.length;
  const chainRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  const [revealed, setRevealed] = useState(0);
  const [connected, setConnected] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [progressStep, setProgressStep] = useState<number | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const play = useCallback(() => {
    clearTimers();

    // Movimento reduzido: cadeia inteira acesa de uma vez, sem timers.
    if (reducedMotion()) {
      setAnimating(false);
      setRevealed(total);
      setConnected(total);
      setProgressStep(null);
      return;
    }

    setAnimating(true);
    setRevealed(0);
    setConnected(0);
    setProgressStep(1);

    steps.forEach((_, i) => {
      timersRef.current.push(
        window.setTimeout(() => {
          setRevealed(i + 1);
          setProgressStep(i + 1);
          timersRef.current.push(
            window.setTimeout(() => setConnected(i + 1), CONN_MS),
          );
        }, i * STEP_MS),
      );
    });

    timersRef.current.push(
      window.setTimeout(() => setProgressStep(null), total * STEP_MS + TAIL_MS),
    );
  }, [clearTimers, steps, total]);

  // Toda a limpeza de timers em um lugar: nada sobrevive ao unmount.
  useEffect(() => clearTimers, [clearTimers]);

  /**
   * `apObserve` do original: só narra quando a cadeia está visível, senão o
   * usuário perde a sequência inteira antes de rolar até ela. Mantido porque o
   * card fica abaixo do risk score e costuma nascer fora da viewport.
   */
  useEffect(() => {
    const element = chainRef.current;
    if (!element || total === 0) return;

    if (reducedMotion()) {
      play();
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const raf = requestAnimationFrame(play);
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          play();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [play, total]);

  return (
    <div className="stat-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}
      >
        <h2 className="text-[16px] font-bold">
          Cadeia de Ataque{' '}
          <span className="text-[13px] font-normal text-fg-dim">· {total} passos</span>
        </h2>

        <div className="flex items-center gap-3">
          {progressStep !== null && (
            <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
              Passo {progressStep} de {total}
            </span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ gap: 6 }}
            onClick={play}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4.5v15l13-7.5-13-7.5z" />
            </svg>
            Reproduzir Cadeia
          </button>
        </div>
      </div>

      <div
        id="ap-chain"
        ref={chainRef}
        className={animating ? 'animate' : undefined}
        style={{ padding: 20 }}
      >
        {steps.map((step, i) => (
          <ChainStep
            key={step.step}
            step={step}
            last={i === total - 1}
            lit={i < revealed}
            climax={i === total - 1 && revealed === total}
            connFilled={i < connected}
            /* Escalona o brilho dos conectores críticos como o original fazia
               com `critCount++ * 3`. */
            critOrder={
              steps
                .slice(0, i)
                .filter((s) => stepSeverity(s) === 'critical').length
            }
          />
        ))}
      </div>
    </div>
  );
}

/** Severidade do passo = severidade do primeiro finding correlacionado. */
function stepSeverity(step: AttackStep): string {
  const finding = FINDINGS.find((f) => step.finding_ids.includes(f.id));
  return finding?.severity ?? 'info';
}

function ChainStep({
  step,
  last,
  lit,
  climax,
  connFilled,
  critOrder,
}: {
  step: AttackStep;
  last: boolean;
  lit: boolean;
  climax: boolean;
  connFilled: boolean;
  critOrder: number;
}) {
  const finding = FINDINGS.find((f) => step.finding_ids.includes(f.id));
  const severity = finding?.severity ?? 'info';
  const critical = severity === 'critical';

  const stepClass = ['ap-step', lit ? 'lit' : '', climax ? 'climax' : '']
    .filter(Boolean)
    .join(' ');
  const connClass = ['ap-conn', connFilled ? 'filled' : '', connFilled && critical ? 'crit' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={stepClass}
      data-sev={severity}
      style={{ '--sc': sevColor(severity), paddingBottom: 24 } as CSSProperties}
    >
      {!last && (
        <div className={connClass}>
          <div className="fill" />
          <div className="shim" style={critical ? { animationDelay: `${critOrder * 3}s` } : undefined} />
        </div>
      )}

      <div className="ap-node">
        <span className="ap-ring" />
        <div className="ap-dot">{step.step}</div>
      </div>

      <div className="ap-body">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="ap-tactic">{AP_PHASES[step.phase] ?? step.phase}</span>
          <span
            className="mono rounded px-1.5 py-0.5 text-[10px]"
            style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)' }}
          >
            {step.technique}
          </span>
          {step.caldera_validated && (
            <span
              title="Confirmado por emulação Caldera em sandbox"
              className="cursor-help text-[10px]"
              style={{
                padding: '2px 8px',
                borderRadius: 100,
                background: 'rgba(46,204,139,.14)',
                color: '#2ecc8b',
                border: '1px solid rgba(46,204,139,.3)',
              }}
            >
              validado por emulação
            </span>
          )}
        </div>

        <p className="mb-2 text-[13.5px] leading-relaxed text-fg">{step.description}</p>

        {finding && (
          <Link href={`${SCREEN_ROUTES.findings}?finding=${finding.id}`} className="ap-fcard">
            <SevBadge severity={finding.severity} />
            <span className="text-[12px] text-fg-mute">{finding.title}</span>
            <span className="mono text-[10px] text-fg-dim">
              {finding.source} · {finding.file_path}:{finding.line_number}
              {finding.cve_id ? ` · ${finding.cve_id}` : ''}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0 text-fg-dim"
              style={{ marginLeft: 'auto' }}
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
