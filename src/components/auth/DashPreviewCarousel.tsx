'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PREVIEW_NAVIGATE_MESSAGE,
  type DashScreen,
  type PreviewNavigateMessage,
} from '@/lib/dash-routes';

/** Largura de design do dashboard — o iframe é escalado a partir dela. */
const APP_DESIGN_WIDTH = 1500;

const INTRO_MS = 1800;
const CARD_MS = 4600;

type Step = { intro: string } | { screen: DashScreen; label: string };

/** Carrossel do painel esquerdo: a intro e depois telas reais do dashboard. */
const STEPS: Step[] = [
  { intro: 'Bem-vindo ao aperIA' },
  { screen: 'home', label: 'Postura de Segurança' },
  { screen: 'findings', label: 'Findings' },
  { screen: 'attack', label: 'AI Insights' },
  { screen: 'remediations', label: 'Remediações' },
];

function isIntro(step: Step): step is { intro: string } {
  return 'intro' in step;
}

export function DashPreviewCarousel() {
  const [active, setActive] = useState(0);
  const pausedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const step = STEPS[active];
  const intro = isIntro(step);

  // ── Avanço do carrossel: intro fica 1.8s, cada tela 4.6s ──
  // Timeout encadeado (não interval) para que a duração varie por passo, e
  // pausado no hover via ref — sem re-renderizar por causa da pausa.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer: number;
    let position = 0;

    const tick = () => {
      const delay = isIntro(STEPS[position]) ? INTRO_MS : CARD_MS;
      timer = window.setTimeout(() => {
        if (!pausedRef.current) {
          position = (position + 1) % STEPS.length;
          setActive(position);
        }
        tick();
      }, delay);
    };

    tick();
    return () => window.clearTimeout(timer);
  }, []);

  // ── Escala do iframe: renderiza em 1500px e encolhe até caber ──
  const fitIframe = useCallback(() => {
    const iframe = iframeRef.current;
    const container = frameRef.current;
    if (!iframe || !container) return;

    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;

    const scale = width / APP_DESIGN_WIDTH;
    iframe.style.width = `${APP_DESIGN_WIDTH}px`;
    iframe.style.height = `${Math.ceil(height / scale)}px`;
    iframe.style.transform = `scale(${scale})`;
  }, []);

  useEffect(() => {
    fitIframe();
    const container = frameRef.current;
    if (!container) return;

    const observer = new ResizeObserver(fitIframe);
    observer.observe(container);
    return () => observer.disconnect();
  }, [fitIframe]);

  // ── Navegação do preview ──
  // O original alcançava o DOM do iframe e clicava em `.sb-item[data-screen]`.
  // Aqui a comunicação é por postMessage: o layout do dashboard escuta e faz
  // router.push, então a navegação não recarrega o iframe (sem flash nem
  // necessidade de reescalar).
  useEffect(() => {
    if (intro) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const message: PreviewNavigateMessage = {
      type: PREVIEW_NAVIGATE_MESSAGE,
      screen: step.screen,
    };
    iframe.contentWindow.postMessage(message, window.location.origin);
  }, [active, intro, step]);

  return (
    <aside
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      className="relative flex flex-col overflow-hidden bg-[image:linear-gradient(155deg,#f2f0e9_0%,#e7e3d9_100%)] px-[34px] pb-11 pt-[34px] max-[880px]:hidden"
    >
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <div
          ref={frameRef}
          className={`relative min-h-0 flex-1 overflow-hidden rounded-[15px] border border-[#dfe2e7] bg-white shadow-[0_30px_80px_-42px_rgba(20,24,31,0.55)] transition-[opacity,transform] duration-[550ms] ease-out ${
            intro ? 'pointer-events-none scale-[0.97] opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          <iframe
            ref={iframeRef}
            src="/dash?preview=1&theme=light"
            title="aperIA dashboard real"
            scrolling="no"
            onLoad={fitIframe}
            className="absolute left-0 top-0 origin-top-left border-0 bg-[#f4f6fa]"
          />
        </div>

        {/* intro (antes do dash aparecer) */}
        <div
          className={`pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-center p-6 text-center transition-opacity duration-700 ${
            intro ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="font-intro text-[clamp(42px,4.8vw,60px)] font-normal leading-[1.06] tracking-[-0.01em] text-ink">
            Bem-vindo ao aper<span className="text-brand">IA</span>
          </div>
          <div className="mt-[22px] h-[3px] w-[46px] rounded-full bg-brand shadow-[0_0_12px_rgba(216,31,42,0.6)]" />
        </div>

        {/* dots */}
        <div className="absolute bottom-[14px] left-0 right-0 z-[4] flex justify-center gap-[7px]">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`h-[7px] rounded-full transition-all duration-[400ms] ${
                active === index ? 'w-[22px] bg-brand' : 'w-[7px] bg-[#c4c9d0]'
              }`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
