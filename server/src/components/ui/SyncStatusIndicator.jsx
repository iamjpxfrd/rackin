// Bordered two-part readout of the tablet's last reported outbox state
// (ADR-002 Action Item 8), per the desktop dashboard design canvas — a
// colored dot + bold LABEL + muted DETAIL, so the LABEL alone never has to
// carry both "what" and "when."

// The tablet only reports on a sync trigger (a write, a reconnect, or a
// retry-while-queued timer) — there is no heartbeat, so a caught-up tablet
// naturally goes quiet for hours whenever the gym does (overnight, a slow
// stretch). ADR-002's own example of what this should catch is staleness on
// the order of days ("this tablet has not reported since Tuesday"), not
// minutes — so the threshold is set there, wide enough to absorb a normal
// idle period without flagging one as a fault.
const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

const COLOR = { synced: "var(--color-accent)", pending: "var(--color-warning)", never: "var(--color-danger)" };

/**
 * @param {{ status: {error: true} | {pendingCount: number, oldestPendingAt: string|null, reportedAt: string|null} }} props
 */
export default function SyncStatusIndicator({ status }) {
  if (status.error) {
    return <Chip tone="never" label="Error" detail="Can't reach backend" />;
  }

  const { pendingCount, oldestPendingAt, reportedAt } = status;

  if (reportedAt === null) {
    return <Chip tone="never" label="Not Synced" detail="No report yet" />;
  }
  if (pendingCount > 0) {
    return (
      <Chip tone="pending" label={`${pendingCount} Pending`} detail={`Oldest ${formatRelative(oldestPendingAt)}`} />
    );
  }
  if (elapsedMs(reportedAt) > FRESH_WINDOW_MS) {
    return <Chip tone="never" label="Not Synced" detail={`Last synced ${formatRelative(reportedAt)}`} />;
  }
  return <Chip tone="synced" label="Synced" detail={formatRelative(reportedAt)} />;
}

function Chip({ tone, label, detail }) {
  const color = COLOR[tone];
  return (
    <span
      className="inline-flex h-9 shrink-0 items-center gap-2.5 px-4"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `2px solid ${color}` }}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      <span className="whitespace-nowrap font-heading text-xs uppercase tracking-[0.08em]" style={{ color }}>
        {label}
      </span>
      <span className="whitespace-nowrap font-body text-xs text-text-muted">{detail}</span>
    </span>
  );
}

// Both defined outside the component: a literal Date.now() written inside
// render is an impure call React's rules forbid (react-hooks/purity).
function elapsedMs(isoString) {
  return Date.now() - new Date(isoString).getTime();
}

function formatRelative(isoString) {
  if (!isoString) return "just now";
  const minutes = Math.floor(elapsedMs(isoString) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
