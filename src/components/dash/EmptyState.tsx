/** Mascote-detetive desenhado em traço — usado nos estados vazios. */
export function MascotSvg({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* cabeça + orelhas */}
      <path d="M40 30 L33 52 C34 71 45 84 58 84 C71 84 82 71 83 52 L76 30 L69 46 C64 43 52 43 47 46 Z" />
      {/* boina de detetive: domo + aba */}
      <path d="M40 34 Q58 20 76 34" />
      <path d="M37 38 Q58 46 79 38" />
      {/* olho esquerdo */}
      <circle cx="50" cy="58" r="2.4" fill="currentColor" stroke="none" />
      {/* nariz + boca */}
      <path d="M58 66 l-2.5 3 h5 Z" fill="currentColor" stroke="none" />
      <path d="M58 69 v3 M58 72 q-4 3 -8 1 M58 72 q4 3 8 1" />
      {/* bigodes */}
      <path d="M46 66 L30 63 M46 70 L31 71" />
      {/* lupa sobre o olho direito */}
      <circle cx="70" cy="58" r="9" />
      <path d="M76.5 64.5 L88 76" />
      {/* glifo de código dentro da lente */}
      <path d="M67 55 v6 M72 55 v6 M65.5 57.5 h7 M65.5 60 h7" strokeWidth="1.1" />
    </svg>
  );
}

/**
 * Estado vazio padrão do dashboard.
 *
 * `action` recebe um elemento (botão ou Link) em vez de string de HTML, que era
 * como o helper original funcionava.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center" style={{ padding: '56px 24px' }}>
      <div className="mb-5 text-fg-dim">
        <MascotSvg />
      </div>
      <div className="mb-2 text-[16px] font-semibold leading-[1.35] text-fg">{title}</div>
      <p className="max-w-[42ch] text-[13px] leading-[1.55] text-fg-mute">{body}</p>
      {action && <div className="mt-[18px]">{action}</div>}
    </div>
  );
}
