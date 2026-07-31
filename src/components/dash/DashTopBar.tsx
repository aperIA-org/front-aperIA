'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CurrentUser } from '@/lib/api/user';
import { SCREEN_LABELS, screenFromPathname } from '@/lib/dash/dash-routes';
import { useDashState } from '@/lib/dash/dash-state';
import { SCAN_JOBS } from '@/lib/dash/mock-data';
import {
  IconBell,
  IconChevronDown,
  IconLogout,
  IconMoon,
  IconSearch,
  IconSun,
} from './DashIcons';

/** Breadcrumb do detalhe de execução mostra repo + PR, como no protótipo. */
function useBreadcrumb(pathname: string): string {
  const screen = screenFromPathname(pathname);
  if (screen !== 'reportDetail') return SCREEN_LABELS[screen];

  const execId = pathname.split('/').pop();
  const job = SCAN_JOBS.find((j) => j.id === execId);
  if (!job) return SCREEN_LABELS.reportDetail;
  return `Relatórios / ${job.repo_full_name.split('/')[1]} · PR #${job.pr_number}`;
}

export function DashTopBar({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  const { theme, toggleTheme, logout } = useDashState();
  const breadcrumb = useBreadcrumb(pathname);
  const isHome = screenFromPathname(pathname) === 'home';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');

  // Sem sessão resolvida o header não inventa um nome.
  const parts = user?.username.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials =
    parts.length === 0
      ? '—'
      : parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  const shortName = parts[0] ?? 'Conta';

  // Fecha o menu do usuário ao clicar fora.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!menuWrapRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [menuOpen]);

  return (
    <header
      className="sticky top-0 z-10 h-14 border-b border-line"
      style={{ background: 'var(--bg-page)', flex: '0 0 56px', minHeight: 56 }}
    >
      <div className="relative mx-auto flex h-full max-w-[1440px] items-center gap-4 px-8">
        {/* O protótipo esconde o breadcrumb na Início. */}
        <div
          className="flex items-center gap-2 text-[13px] text-fg-dim"
          style={{ display: isHome ? 'none' : 'flex' }}
        >
          <span className="text-fg-mute">Acme</span>
          <span className="text-fg-dim">/</span>
          <span className="text-fg">{breadcrumb}</span>
        </div>

        <div className="absolute left-1/2 w-full max-w-[400px] -translate-x-1/2 px-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim">
              <IconSearch />
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar… (⌘K)"
              aria-label="Buscar"
              className="inp w-full"
              style={{ paddingLeft: 32, paddingRight: 44, background: 'var(--bg-page)' }}
            />
            <span
              className="mono absolute right-3 top-1/2 -translate-y-1/2 rounded-xs border border-line px-1.5 py-0.5 text-[10px] text-fg-dim"
              style={{ background: 'var(--bg-surface-raised)' }}
            >
              ⌘K
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            title="Alternar tema"
            aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
            className="flex h-9 items-center gap-2 rounded-md px-3 text-fg-mute transition-colors hover:bg-surface hover:text-fg"
            style={{ border: '1px solid var(--border-default)' }}
          >
            <span className="relative grid h-[17px] w-[17px] flex-shrink-0 place-items-center">
              <IconSun />
              <IconMoon />
            </span>
            <span className="whitespace-nowrap text-[12px] font-medium">
              <span className="th-lbl-light">Modo claro</span>
              <span className="th-lbl-dark">Modo escuro</span>
            </span>
          </button>

          <button
            type="button"
            aria-label="Notificações"
            className="relative grid h-9 w-9 place-items-center rounded-md text-fg-mute transition-colors hover:bg-surface hover:text-fg"
          >
            <IconBell />
            <span
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
              style={{ background: '#c22f3d' }}
            />
          </button>

          <div className="h-7 w-px bg-line" />

          <div className="relative" ref={menuWrapRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-surface"
            >
              <div className="mono grid h-7 w-7 place-items-center rounded-full bg-line text-[11px] font-semibold">
                {initials}
              </div>
              <span className="text-sm text-fg">{shortName}</span>
              <span className="text-fg-dim">
                <IconChevronDown />
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-[120] min-w-[220px] overflow-hidden rounded-[10px]"
                style={{
                  top: 'calc(100% + 8px)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  boxShadow: '0 10px 28px rgba(0,0,0,.18)',
                }}
              >
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
                  <div className="text-[13.5px] font-semibold text-fg">
                    {user?.username ?? 'Sessão não identificada'}
                  </div>
                  <div className="mt-0.5 text-[12px] text-fg-dim">
                    {user?.email ?? 'Faça login novamente para carregar seus dados.'}
                  </div>
                </div>
                <div
                  className="flex items-center gap-[9px]"
                  style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-default)' }}
                >
                  <div
                    className="mono grid h-6 w-6 flex-shrink-0 place-items-center rounded-md text-[11px] font-semibold"
                    style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)' }}
                  >
                    A
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.05em] text-fg-faint">
                      Organização
                    </div>
                    <div className="text-[12.5px] font-semibold text-fg">Acme · Pessoal</div>
                  </div>
                </div>
                <button
                  role="menuitem"
                  type="button"
                  onClick={logout}
                  className="flex w-full cursor-pointer items-center gap-[9px] border-none bg-transparent px-[14px] py-[11px] text-left text-[13px] transition-colors hover:bg-surface-hover"
                  style={{ color: '#c4101a' }}
                >
                  <IconLogout />
                  Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
