'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { findingRoute } from '@/lib/dash/dash-routes';
import { REM_STATUS_PT } from '@/lib/dash/format';
import type { Finding, Remediation, RemediationStatus, ScanJob } from '@/lib/dash/types';
import { DiffView } from './DiffView';
import { SevBadge } from './SevBadge';

const STATUS_CLASS: Record<RemediationStatus, string> = {
  suggested: 'st-queued',
  approved: 'st-done',
  rejected: 'st-failed',
  merged: 'st-done',
};

/** Identificadores em CAIXA ALTA ganham fonte mono dentro das instruções. */
const UPPER_ID = /\b([A-Z][A-Z0-9_/]{6,})\b/g;

function withMonoIds(text: string) {
  return text.split(UPPER_ID).map((part, i) =>
    i % 2 === 1 ? (
      <span key={`${i}-${part}`} className="mono">
        {part}
      </span>
    ) : (
      <Fragment key={`${i}-${part}`}>{part}</Fragment>
    ),
  );
}

function WarningIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#eab308"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-px flex-shrink-0"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline align-[-1px]"
      aria-hidden="true"
    >
      <path d="M14 4h6v6M20 4l-9 9M17 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h6" />
    </svg>
  );
}

/** Bloco de rotação de credencial — superfície neutra com borda âmbar. */
function RotationBlock({ instructions }: { instructions: string | null }) {
  const steps = (instructions ?? '')
    .split('\n')
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  return (
    <div
      className="my-2.5 flex items-start gap-[9px] rounded-md border border-line px-3 py-2.5"
      style={{ background: 'var(--bg-surface)', borderLeft: '3px solid #eab308' }}
    >
      <WarningIcon />
      <div style={{ minWidth: 0 }}>
        <div className="text-[13px] font-semibold text-fg">
          Rotação de credencial necessária
        </div>
        {steps.length > 0 ? (
          <ol className="mt-2 list-decimal pl-5">
            {steps.map((step, i) => (
              <li
                key={`${i}-${step}`}
                className="mb-1 pl-0.5 text-[12.5px] leading-[1.5] text-fg"
              >
                {withMonoIds(step)}
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-px text-[12px] text-fg-mute">
            Este secret foi verificado, rotacione a credencial antes de aplicar o patch.
          </div>
        )}
      </div>
    </div>
  );
}

export function RemediationCard({
  remediation,
  status,
  approvedBy,
  finding,
  job,
  highlighted,
  onApprove,
  onReject,
}: {
  remediation: Remediation;
  /** Status efetivo — pode vir de uma aprovação feita nesta sessão. */
  status: RemediationStatus;
  approvedBy: string | null;
  finding?: Finding;
  job?: ScanJob;
  highlighted?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div
      id={`rem-${remediation.id}`}
      className="stat-card mb-6"
      style={{
        transition: 'box-shadow .3s',
        boxShadow: highlighted ? '0 0 0 2px #c22f3d' : undefined,
      }}
    >
      <div className="mb-3 flex items-start justify-between">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex flex-wrap items-center gap-2">
            {finding?.severity && <SevBadge severity={finding.severity} />}
            <span className={`sev ${STATUS_CLASS[status]}`}>
              {REM_STATUS_PT[status] ?? status}
            </span>
          </div>

          <h3 className="mt-2 text-[15px] font-semibold leading-snug">
            {finding?.title ?? `Finding #${remediation.finding_id}`}
          </h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-mute">
            {remediation.explanation}
          </p>

          {remediation.requires_secret_rotation && (
            <RotationBlock instructions={remediation.rotation_instructions} />
          )}
        </div>
      </div>

      <div className="mb-2 text-[14px] text-fg-mute">Patch diff · gerado pela I.A</div>
      <DiffView patch={remediation.patch_diff} filePath={finding?.file_path} />

      <div className="mt-3 flex items-center gap-4 text-[12px]">
        {finding && (
          // No protótipo isto abria o painel lateral do finding; com rotas reais
          // o alvo é a tela de Findings apontando para o finding de origem.
          <Link
            href={findingRoute(finding.id)}
            className="lnk-ext"
          >
            Origem: {finding.title}
          </Link>
        )}
        {finding?.repo_url && job?.pr_number && (
          <a
            className="lnk-ext"
            href={`${finding.repo_url}/pull/${job.pr_number}`}
            target="_blank"
            rel="noopener"
          >
            PR #{job.pr_number} <ExternalIcon />
          </a>
        )}
      </div>

      {status === 'suggested' ? (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" className="btn btn-sm btn-success" onClick={onApprove}>
            Aprovar patch
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={onReject}>
            Rejeitar
          </button>
        </div>
      ) : status === 'approved' ? (
        <div className="mt-3 text-[12px]" style={{ color: '#22c55e' }}>
          Aprovado por {approvedBy || '—'}
        </div>
      ) : status === 'rejected' ? (
        <div className="mt-3 text-[12px]" style={{ color: '#ef4444' }}>
          Rejeitado por {approvedBy || '—'}
        </div>
      ) : null}
    </div>
  );
}
