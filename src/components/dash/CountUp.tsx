'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 900;

/**
 * Contagem animada até `to`.
 *
 * Renderiza o valor FINAL no servidor e no primeiro paint, e só então anima a
 * partir do zero. Assim o HTML servido já tem o número correto (sem mismatch de
 * hidratação, e legível sem JS), e sob `prefers-reduced-motion` nada se move.
 */
export function CountUp({ to, className }: { to: number; className?: string }) {
  const [value, setValue] = useState(to);
  const frameRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(to);
      return;
    }

    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / DURATION_MS);
      // ease-out cúbico, igual ao protótipo
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [to]);

  return <span className={className}>{value}</span>;
}
