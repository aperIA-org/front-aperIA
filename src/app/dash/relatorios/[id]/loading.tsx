import {
  AttackPathSkeleton,
  FindingsSkeleton,
  ReportHeaderSkeleton,
} from '@/components/dash/ReportSkeletons';

/**
 * O primeiro paint da tela de relatório.
 *
 * O App Router envolve o segmento em `<Suspense>` sozinho e usa isto como
 * fallback, então o skeleton aparece dentro do `DashShell` já renderizado — a
 * sidebar e o topbar não piscam.
 *
 * Três blocos, na ordem da página final e com as mesmas medidas: é o que evita o
 * salto de layout quando o conteúdo entra. Antes disto a rota ficava **em
 * branco** até `scan` + `relatório` + `ferramentas` + `findings` resolverem
 * todos.
 */
export default function Loading() {
  return (
    <div className="rep-page">
      <ReportHeaderSkeleton />
      <AttackPathSkeleton />
      <FindingsSkeleton />
    </div>
  );
}
