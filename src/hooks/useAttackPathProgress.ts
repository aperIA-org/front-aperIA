'use client';

import { useEffect, useRef, useState } from 'react';
import { attackPathCaption } from '@/lib/landing/attack-path-nodes';

/** Zona morta do original: ignora variações menores que isto. */
const DEAD_BAND = 0.002;

type AttackPathProgress = {
  /** Anexar à section — recebe a custom property `--ap` a cada frame. */
  sectionRef: React.RefObject<HTMLElement | null>;
  /** `Math.round(p * 94)` — o número grande e a barra de progresso. */
  confidence: number;
  caption: string;
};

/**
 * Mede o progresso do scroll dentro da seção Attack Path.
 *
 * O valor contínuo NÃO vira state: é escrito direto como `--ap` no elemento,
 * e o CSS deriva trilho, marcador e os 14 nós a partir dele (ver globals.css).
 * Só passam pelo React os dois valores discretos que aparecem como texto —
 * `confidence` (≤95 valores possíveis) e `caption` (5 strings).
 */
export function useAttackPathProgress(): AttackPathProgress {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [caption, setCaption] = useState(() => attackPathCaption(0));

  // Espelho local do progresso: evita ler state dentro do rAF.
  const progressRef = useRef(0);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const apply = (progress: number) => {
      progressRef.current = progress;
      element.style.setProperty('--ap', String(progress));
      setConfidence(Math.round(progress * 94));
      setCaption(attackPathCaption(progress));
    };

    // Sob redução de movimento: tudo aceso, sem listeners.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply(1);
      return;
    }

    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = element.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const span = rect.height - vh * 0.42;
      const raw =
        span > 0 ? (vh * 0.62 - rect.top) / span : rect.top < vh ? 1 : 0;
      const next = Math.min(1, Math.max(0, raw));

      if (Math.abs(next - progressRef.current) <= DEAD_BAND) return;
      apply(next);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return { sectionRef, confidence, caption };
}
