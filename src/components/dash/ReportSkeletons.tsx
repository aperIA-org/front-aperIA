/**
 * Os placeholders do detalhe do relatório.
 *
 * Eles servem dois lugares: o `loading.tsx` da rota (o primeiro paint, antes de
 * qualquer dado) e os `<Suspense>` por seção da própria página. Ficarem no mesmo
 * módulo é o que garante que as duas coisas tenham a **mesma** estrutura da tela
 * real — a razão de existir de um skeleton é não haver salto de layout quando o
 * conteúdo entra, e duas cópias divergem na primeira alteração.
 *
 * São três blocos, como no desenho: cabeçalho, cadeia e findings. Cada barra tem
 * largura e altura fixas, tiradas dele — um skeleton que se adapta ao conteúdo
 * que ainda não existe é só um retângulo pulsando.
 */

/** Uma barra. `w` em px ou porcentagem. */
function Bar({
  w,
  h,
  r,
  style,
}: {
  w: number | string;
  h: number;
  r?: number;
  style?: React.CSSProperties;
}) {
  return <span className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** Trilha de navegação. */
function CrumbSkeleton() {
  return (
    <div className="rep-crumb">
      <Bar w={52} h={12} />
      <span className="rep-crumb-sep" aria-hidden="true">
        /
      </span>
      <Bar w={150} h={12} />
      <span className="rep-crumb-sep" aria-hidden="true">
        /
      </span>
      <Bar w={64} h={12} />
    </div>
  );
}

/** Cabeçalho: bloco de risco, identidade e a faixa de quatro indicadores. */
export function ReportHeaderSkeleton() {
  return (
    <>
      <CrumbSkeleton />
      <div className="rep-card rep-hd rep-mb">
        <div className="rep-hd-top">
          <Bar w={52} h={42} r={9} style={{ flexShrink: 0 }} />
          <div className="rep-hd-div" aria-hidden="true" />
          <div className="rep-hd-body flex flex-col gap-[9px]">
            <Bar w={210} h={16} />
            <Bar w="min(400px, 100%)" h={12} />
          </div>
          <Bar w={130} h={12} style={{ flexShrink: 0 }} />
        </div>
        <div className="rep-kpi">
          {[
            [70, 96],
            [56, 82],
            [100, 88],
            [92, 70],
          ].map(([lb, vl], i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bar w={lb} h={10} />
              <Bar w={vl} h={14} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * A cadeia: cabeçalho do card e três passos no trilho **centralizado**.
 *
 * A grade `1fr 30px 1fr` é a mesma do `.apc-step` real, e é o que faz o nó cair
 * no mesmo pixel quando o conteúdo entra.
 */
export function AttackPathSkeleton() {
  return (
    <div className="rep-card apc rep-mb">
      <div className="mb-5 flex items-center gap-2.5">
        <Bar w={24} h={24} r={7} />
        <Bar w={200} h={15} />
        <Bar w={150} h={11} style={{ marginLeft: 'auto' }} />
      </div>
      <div className="flex flex-col gap-[18px]">
        {[
          [150, 170],
          [120, 140],
          [160, 120],
        ].map(([left, right], i) => (
          <div key={i} className="apc-step">
            <Bar w={left} h={12} style={{ marginLeft: 'auto' }} />
            <Bar w={24} h={24} r={12} style={{ margin: '0 auto' }} />
            <Bar w={right} h={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card de findings: cabeçalho, banda e linhas. */
export function FindingsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="rep-card fb">
      <div className="fb-hd">
        <Bar w={180} h={15} />
        <Bar w={180} h={20} r={5} style={{ marginLeft: 'auto' }} />
      </div>
      <Bar w="100%" h={38} r={0} style={{ borderRadius: '9px 9px 0 0', marginBottom: 1 }} />
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderTop: 'none',
          borderRadius: '0 0 9px 9px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-[13px]">
            <Bar w={66} h={20} r={20} style={{ flexShrink: 0 }} />
            <Bar w="100%" h={12} style={{ flex: 1 }} />
            <Bar w={80} h={11} style={{ flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Impacto ao negócio — fallback do `<Suspense>`, fora do primeiro paint. */
export function ReportImpactSkeleton() {
  return (
    <div className="rep-verd" data-s="none">
      <Bar w={20} h={20} r={10} style={{ flexShrink: 0 }} />
      <div className="rep-verd-b flex flex-col gap-2">
        <Bar w={190} h={13} />
        <Bar w="min(460px, 100%)" h={11} />
      </div>
    </div>
  );
}
