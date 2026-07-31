/** Ícones da sidebar e do header — extraídos do protótipo, stroke 1.5. */

const S = {
  width: 17,
  height: 17,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconHome() {
  return (
    <svg {...S}>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.2" />
      <rect x="10.5" y="2.5" width="6" height="6" rx="1.2" />
      <rect x="2.5" y="10.5" width="6" height="6" rx="1.2" />
      <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" />
    </svg>
  );
}

export function IconScans() {
  return (
    <svg {...S}>
      <path d="M3 7V5a2 2 0 012-2h2" />
      <path d="M17 3h2a2 2 0 012 2v2" />
      <path d="M21 17v2a2 2 0 01-2 2h-2" />
      <path d="M7 21H5a2 2 0 01-2-2v-2" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M15.4 15.4L18 18" />
    </svg>
  );
}

export function IconReports() {
  return (
    <svg {...S}>
      <path d="M6 2.5h8l4 4v15H6z" />
      <path d="M14 2.5v4h4" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" />
    </svg>
  );
}

export function IconFindings() {
  return (
    <svg {...S}>
      <path d="M12 2.2l6.5 2.3v4.5c0 4-2.7 6.8-6.5 7.8-3.8-1-6.5-3.8-6.5-7.8V4.5L12 2.2z" />
    </svg>
  );
}

export function IconRemediations() {
  return (
    <svg {...S}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconAttack() {
  return (
    <svg {...S}>
      <path d="M12 2.5l1.4 4L18 8l-4.6 1.5L12 14l-1.4-4.5L6 8l4.6-1.5L12 2.5z" />
      <path d="M16.5 13.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7z" />
    </svg>
  );
}

export function IconRepos() {
  return (
    <svg {...S}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function IconTeam() {
  return (
    <svg {...S}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <path d="M16 5.5a3 3 0 010 6M17.5 14.2c2.2.4 3.5 2.1 3.5 4.3" />
    </svg>
  );
}

export function IconChevronRight({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.5-4.5" />
    </svg>
  );
}

export function IconSun() {
  return (
    <svg
      className="th-ico th-sun"
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </svg>
  );
}

export function IconMoon() {
  return (
    <svg
      className="th-ico th-moon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A8.5 8.5 0 1111.2 3a6.6 6.6 0 009.8 9.8z" />
    </svg>
  );
}

export function IconBell() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 18V11a6 6 0 1112 0v7M4 18h16M10 21a2 2 0 004 0" />
    </svg>
  );
}

export function IconChevronDown({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconLogout() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
