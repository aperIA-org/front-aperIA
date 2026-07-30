/**
 * O wordmark "aperIA".
 *
 * No site estático, um patch script varria o DOM procurando elementos cujo
 * textContent fosse exatamente "aperIA" para estampar `data-apr-logo` e
 * aplicar a fonte LAWLER. Aqui é só um componente.
 */
export function Wordmark({
  className = '',
  withGlow = false,
}: {
  className?: string;
  withGlow?: boolean;
}) {
  return (
    <span
      className={`font-logo font-normal leading-none ${className}`}
      style={
        withGlow
          ? // color-mix(in srgb, #e5333b 55%, transparent) — com fallback direto
            { textShadow: '0 0 14px rgba(229,51,59,0.55)' }
          : undefined
      }
    >
      aper<span className="text-accent-bright">IA</span>
    </span>
  );
}
