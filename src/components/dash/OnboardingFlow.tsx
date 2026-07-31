'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useDashState } from '@/lib/dash/dash-state';
import { GH_ORG, INSTALLATION_REPOS } from '@/lib/dash/mock-data';
import { DEFAULT_MONITORED } from '@/lib/dash/mock-data';
import { RepoSelector } from './RepoSelector';

const VALUE_PROPS = [
  {
    text: 'Scans em 3 Tiers: Feedback em até 3 minutos.',
    path: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
  },
  {
    text: 'Attack Paths com raciocínio de IA e MITRE ATT&CK.',
    path: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l3 2" />
      </>
    ),
  },
  {
    text: 'Patches sugeridos como code suggestions, você aprova no PR.',
    path: (
      <>
        <path d="M9 18l-6-6 6-6" />
        <path d="M15 6l6 6-6 6" />
      </>
    ),
  },
];

const PERMISSIONS = [
  {
    perm: 'Leitura de código e metadados',
    reason: 'para executar os scans',
    path: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
  },
  {
    perm: 'Leitura e escrita em pull requests',
    reason: 'para comentar análises e sugerir patches',
    path: (
      <>
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M6 9v6a3 3 0 003 3h6" />
      </>
    ),
  },
  {
    perm: 'Checks',
    reason: 'para bloquear merge quando um secret verificado é encontrado',
    path: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </>
    ),
  },
];

const TRUST = [
  {
    label: 'GitHub App',
    path: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 018 0v3" />
      </>
    ),
  },
  { label: 'Só leitura de código', path: <path d="M5 12l5 5L20 7" /> },
  { label: 'Revogável', path: <path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5" /> },
];

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 25, height: 25 }}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2c-3.2.69-3.88-1.36-3.88-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.79 2.74 1.27 3.41.97.1-.75.41-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 015.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.42.36.79 1.07.79 2.16v3.2c0 .31.21.66.8.55C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

/** Onboarding do GitHub App: conectar → escolher repositórios → dashboard. */
export function OnboardingFlow() {
  const { onboardingStep, connectGitHub, finishOnboarding } = useDashState();
  const [permsOpen, setPermsOpen] = useState(false);

  // ── Passo 2 · escolher repositórios ──
  if (onboardingStep === 2) {
    return (
      <div className="page-wrap" style={{ maxWidth: 760 }}>
        <div className="mb-6">
          <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-fg-muted">
            <span style={{ color: '#22c55e' }}>✓ Conectado</span>
            <span style={{ color: 'var(--divider)' }}>—</span>
          </div>
          <h1 className="mb-1.5 text-[26px] font-bold tracking-[-0.02em]">
            Selecione os repositórios
          </h1>
          <p className="max-w-[56ch] text-sm leading-[1.6] text-fg-mute">
            A instalação concedeu acesso a {INSTALLATION_REPOS.length} repositórios de{' '}
            {GH_ORG}. Escolha quais o aperIA deve monitorar, cada PR nesses repos dispara o
            scan de 3 tiers.
          </p>
        </div>
        <RepoSelector
          initialSelection={DEFAULT_MONITORED}
          submitLabel="Começar a monitorar"
          onSubmit={finishOnboarding}
        />
      </div>
    );
  }

  // ── Passo 1 · conectar ──
  const installing = onboardingStep === 'installing';

  return (
    <div
      className="page-wrap flex flex-col justify-center"
      style={{ maxWidth: 1080, minHeight: 'calc(100vh - 56px)' }}
    >
      <div
        className="grid items-center gap-10"
        style={{ gridTemplateColumns: 'minmax(0,50fr) minmax(0,50fr)' }}
      >
        <div>
          <h1 className="mb-2.5 text-[38px] font-semibold leading-[1.05] tracking-[-0.028em]">
            Bem-vindo ao <span className="text-fg">aper</span>
            <span style={{ color: '#c22f3d' }}>IA</span>
          </h1>
          <p className="mb-7 text-base leading-[1.5] text-fg-mute">
            Segurança ofensiva com IA em cada pull request.
          </p>

          <div className="mb-8 flex flex-col gap-3.5">
            {VALUE_PROPS.map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#c22f3d"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-px flex-shrink-0"
                >
                  {item.path}
                </svg>
                <span className="text-sm leading-[1.45] text-fg-hi">{item.text}</span>
              </div>
            ))}
          </div>

          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={connectGitHub}
              disabled={installing}
              style={{
                height: 46,
                padding: '0 22px',
                fontSize: 15,
                gap: 9,
                ...(installing ? { opacity: 0.7, cursor: 'wait' } : {}),
              }}
            >
              {installing ? (
                <>
                  <svg
                    className="spin"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M21 12a9 9 0 11-9-9" />
                  </svg>
                  Redirecionando ao GitHub…
                </>
              ) : (
                <>
                  <GitHubMark />
                  Conectar GitHub
                </>
              )}
            </button>

            <div className="mt-3.5 flex flex-wrap gap-[18px]">
              {TRUST.map((item) => (
                <span key={item.label} className="flex items-center gap-[5px] text-[12px] text-fg-mute">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    {item.path}
                  </svg>
                  {item.label}
                </span>
              ))}
            </div>

            <div className="mt-[18px]">
              <button
                type="button"
                onClick={() => setPermsOpen((v) => !v)}
                aria-expanded={permsOpen}
                className="flex cursor-pointer items-center gap-[5px] border-none bg-transparent p-0 text-[13px]"
                style={{ color: '#539fe5', font: 'inherit' }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transition: 'transform .2s',
                    transform: permsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
                Quais permissões o aperIA solicita?
              </button>

              {permsOpen && (
                <div
                  className="mt-3"
                  style={{
                    padding: '4px 14px 10px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 8,
                  }}
                >
                  {PERMISSIONS.map((item) => (
                    <div
                      key={item.perm}
                      className="flex items-start gap-2.5"
                      style={{ padding: '9px 0', borderBottom: '1px solid var(--border-default)' }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a1a1a1"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 flex-shrink-0"
                      >
                        {item.path}
                      </svg>
                      <span className="text-[12.5px] leading-[1.5] text-fg-hi">
                        <span className="font-semibold text-fg">{item.perm}</span>, {item.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* mascote com glow + bob, mesmos efeitos da landing */}
        <div className="onb-cat" aria-hidden="true">
          <div className="onb-cat-glow" />
          <Image
            className="onb-cat-img"
            src="/uploads/hero-cat.png"
            alt=""
            width={720}
            height={720}
          />
          <Image
            className="onb-cat-emit"
            src="/uploads/hero-cat.png"
            alt=""
            width={720}
            height={720}
          />
        </div>
      </div>
    </div>
  );
}
