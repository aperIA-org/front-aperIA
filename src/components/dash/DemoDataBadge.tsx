'use client';

import { useDashState } from '@/lib/dash/dash-state';

/**
 * Marca uma tela cujos dados ainda vêm do dataset do protótipo.
 *
 * Findings, Scans, Relatórios, Remediações e AI Emulation continuam lendo
 * `src/lib/dash/mock-data.ts` — os repositórios de lá (`OCR-aperIA/...`) não são
 * os do usuário. Com a conexão GitHub real isso passa a ser enganoso, então o
 * aviso aparece; em modo demonstração (sem `APERIA_API_URL`) o app inteiro já é
 * protótipo e o badge só faria ruído. Quem decide é `showDemoBadge`.
 *
 * Sai de cena quando as telas passarem a ler
 * `/repositories/{id}/{findings,scans,reports}`.
 */
export function DemoDataBadge({ className = '' }: { className?: string }) {
  const { showDemoBadge } = useDashState();

  if (!showDemoBadge) return null;

  return (
    <span
      className={`sev st-queued ${className}`}
      title="Esta tela ainda mostra o dataset de demonstração do protótipo, não os dados dos seus repositórios."
      style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v4h1" />
      </svg>
      Dados de demonstração
    </span>
  );
}
