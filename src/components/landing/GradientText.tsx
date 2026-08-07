/**
 * O tratamento de gradiente vermelho aplicado em 6 títulos da landing:
 * `linear-gradient(180deg,#ff9095,#e5333b)` recortado no texto.
 *
 * A hero usa um drop-shadow um pouco mais forte (`strong`).
 */
export function GradientText({
  children,
  strong = false,
  className = '',
}: {
  children: React.ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`bg-[image:linear-gradient(180deg,#ff9095,#e5333b)] bg-clip-text text-transparent ${className}`}
      style={{
        filter: strong
          ? 'drop-shadow(0 1px 6px rgba(229,51,59,0.45))'
          : 'drop-shadow(0 1px 5px rgba(229,51,59,0.4))',
      }}
    >
      {children}
    </span>
  );
}
