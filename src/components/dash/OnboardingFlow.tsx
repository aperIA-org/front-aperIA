'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ConnectGitHubButton } from './ConnectGitHubButton';

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

/**
 * Boas-vindas e instalação do GitHub App.
 *
 * O protótipo tinha um segundo passo aqui para escolher repositórios. Agora o
 * GitHub redireciona a instalação para `/dash/repositorios?github=conectado`, que
 * já é o seletor com a lista ao vivo — manter uma segunda cópia dele nesta tela
 * duplicaria justamente o que foi colapsado.
 */
export function OnboardingFlow() {
  const [permsOpen, setPermsOpen] = useState(false);

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
            <ConnectGitHubButton size="lg" />

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
