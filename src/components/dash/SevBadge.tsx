/** Badge de severidade — `.sev`/`.sev-fx` vêm do dash.css. */
export function SevBadge({ severity }: { severity: string }) {
  return <span className={`sev sev-${severity} sev-fx`}>{severity}</span>;
}
