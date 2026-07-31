import { notFound } from 'next/navigation';
import { DataScreenGate } from '@/components/dash/DataScreenGate';
import { ReportDetail } from '@/components/dash/ReportDetail';
import { SCAN_JOBS } from '@/lib/dash/mock-data';

/**
 * Detalhe de uma execução — no protótipo era a rota por hash
 * `#/relatorios/:execId`; aqui é uma rota real.
 *
 * O id é validado contra os dados antes de renderizar, então uma URL inválida
 * dá 404 em vez de uma tela quebrada. O corpo é client component porque as
 * linhas de finding navegam no clique.
 */
export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = SCAN_JOBS.find((j) => j.id === id);
  if (!job) notFound();

  return (
    <DataScreenGate>
      <ReportDetail jobId={job.id} />
    </DataScreenGate>
  );
}
