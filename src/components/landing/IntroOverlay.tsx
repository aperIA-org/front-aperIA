'use client';

import { useEffect, useState } from 'react';

const INTRO_MS = 2600;
const FADE_MS = 520;
const SESSION_KEY = 'apr_intro_seen';

/**
 * Cortina de abertura da landing.
 *
 * Toca UMA VEZ por aba (sessionStorage). No site estático isso era feito por um
 * patch script que, se a chave já existisse, ficava varrendo o DOM a cada 16ms
 * procurando um ancestral com z-index >= 999 para remover.
 *
 * Também corrige um bug do original: sob `prefers-reduced-motion` o CSS zerava
 * a opacidade da única linha visível e matava as animações, deixando uma tela
 * bege em branco por 3,1s. Aqui a intro simplesmente não é renderizada.
 */
export function IntroOverlay() {
  // Começa como `null` (= indefinido) para não gerar mismatch de hidratação:
  // sessionStorage e matchMedia só existem no cliente.
  const [visible, setVisible] = useState<boolean | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(SESSION_KEY) !== null;
      window.sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* modo privado / storage bloqueado — apenas toca a intro */
    }

    if (reduceMotion || alreadySeen) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const fadeTimer = window.setTimeout(() => setLeaving(true), INTRO_MS);
    const removeTimer = window.setTimeout(() => setVisible(false), INTRO_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-paper"
      style={
        leaving
          ? {
              opacity: 0,
              transform: 'scale(1.09)',
              filter: 'blur(9px) brightness(1.45)',
              pointerEvents: 'none',
              transition:
                'opacity .55s ease, transform .55s cubic-bezier(.5,0,.2,1), filter .55s ease',
            }
          : undefined
      }
    >
      {/* scanline sutil por cima do bege */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,.04) 0 1px, transparent 1px 3px)',
          mixBlendMode: 'overlay',
        }}
      />
      <p
        className="px-6 text-center text-[clamp(26px,6.2vw,74px)] leading-[1.12] text-ink"
        style={{ animation: 'introTwo 1.6s cubic-bezier(.22,1,.36,1) .3s both' }}
      >
        <span className="mx-auto block max-w-[90vw]">
          Pensando como <i className="not-italic text-accent">atacante</i>, agindo como{' '}
          <i className="not-italic text-accent">defensor</i>.
        </span>
      </p>
    </div>
  );
}
