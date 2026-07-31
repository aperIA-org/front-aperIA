'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDashState } from '@/lib/dash/dash-state';
import { openFindings } from '@/lib/dash/mock-data';
import {
  DATA_SCREENS,
  SCREEN_ROUTES,
  screenFromPathname,
  type DashScreen,
} from '@/lib/dash/dash-routes';
import {
  IconAttack,
  IconChevronRight,
  IconFindings,
  IconHome,
  IconRemediations,
  IconRepos,
  IconReports,
  IconScans,
  IconTeam,
} from './DashIcons';

type NavItem = {
  screen: DashScreen;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

/** `null` = divisória. A ordem segue o fluxo: scan → relatório → finding → remediação → emulação. */
function navItems(findingsCount: number): (NavItem | null)[] {
  return [
    { screen: 'home', label: 'Início', icon: <IconHome /> },
    null,
    { screen: 'pipelines', label: 'Scans', icon: <IconScans /> },
    { screen: 'reports', label: 'Relatórios', icon: <IconReports /> },
    {
      screen: 'findings',
      label: 'Findings',
      icon: <IconFindings />,
      badge: findingsCount,
    },
    { screen: 'remediations', label: 'Remediações', icon: <IconRemediations /> },
    { screen: 'attack', label: 'AI Emulation', icon: <IconAttack /> },
    null,
    { screen: 'integrations', label: 'Repositórios', icon: <IconRepos /> },
    { screen: 'team', label: 'Time', icon: <IconTeam /> },
  ];
}

export function DashSidebar() {
  const pathname = usePathname();
  const { connected, sidebarCollapsed, toggleSidebar } = useDashState();
  const active = screenFromPathname(pathname);
  const items = navItems(openFindings().length);

  return (
    <aside
      id="sb"
      className={sidebarCollapsed ? 'sb-c' : undefined}
      style={{
        width: 256,
        background: 'var(--bg-page)',
        borderRight: '1px solid var(--veil-06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        flexShrink: 0,
        transition: 'width .25s cubic-bezier(.22,.61,.36,1)',
      }}
    >
      <div
        className="sb-header-inner"
        style={{
          flexShrink: 0,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--bg-page)',
          borderBottom: '1px solid var(--veil-06)',
        }}
      >
        <Image
          id="sb-logo"
          src="/uploads/1.png"
          alt="aperIA"
          width={88}
          height={88}
          className="block flex-shrink-0 rounded-[22px] object-contain"
          style={{ width: 88, height: 88, transition: 'width .25s, height .25s' }}
        />
        <div id="sb-wm" className="min-w-0 overflow-hidden whitespace-nowrap">
          <div className="font-sans text-[21px] font-bold leading-none tracking-[-0.015em] text-fg">
            aper<span className="text-[#e11d2a]">IA</span>
          </div>
        </div>
        <button
          id="sb-tgl"
          type="button"
          className="sb-tgl-btn ml-auto flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-[5px]"
          onClick={toggleSidebar}
          title="Recolher sidebar"
          style={{
            background: 'var(--veil-06)',
            border: '1px solid var(--veil-09)',
            color: 'var(--veil-t42)',
          }}
        >
          <IconChevronRight />
        </button>
      </div>

      <nav
        id="sb-nav"
        style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 20px', scrollbarWidth: 'none' }}
      >
        {/* só aparece quando a sidebar está recolhida */}
        <div id="sb-expand-btn" style={{ justifyContent: 'center', marginBottom: 6 }}>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Expandir"
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[5px]"
            style={{
              background: 'var(--veil-06)',
              border: '1px solid var(--veil-09)',
              color: 'var(--veil-t42)',
            }}
          >
            <IconChevronRight size={11} />
          </button>
        </div>

        {items.map((item, index) => {
          if (!item) {
            return (
              <div
                key={`div-${index}`}
                style={{ height: 1, background: 'var(--veil-08)', margin: '6px 4px' }}
              />
            );
          }

          // Durante o onboarding as telas de dados não têm o que mostrar.
          const locked = !connected && DATA_SCREENS.includes(item.screen);
          const isActive = active === item.screen;
          const className = [
            'sb-item',
            isActive ? 'active' : '',
            locked ? 'sb-disabled' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <Link
              key={item.screen}
              href={SCREEN_ROUTES[item.screen]}
              className={className}
              data-screen={item.screen}
              title={item.label}
              aria-disabled={locked || undefined}
              tabIndex={locked ? -1 : undefined}
            >
              <span className="sb-ico">{item.icon}</span>
              <span className="sb-lbl">{item.label}</span>
              {item.badge !== undefined && !locked && (
                <span className="sb-bdg">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
