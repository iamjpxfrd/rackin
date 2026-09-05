// Small, always-visible readout of the tablet's last reported outbox state
// (ADR-002 Action Item 8) — same colored-dot-plus-label pattern as
// StatusBadge.jsx, so color is never the only signal here either.

// The tablet only reports on a sync trigger (a write, a reconnect, or a
// retry-while-queued timer) — there is no heartbeat, so a caught-up tablet
// naturally goes quiet for hours whenever the gym does (overnight, a slow
// stretch). ADR-002's own example of what this should catch is staleness on
// the order of days ("this tablet has not reported since Tuesday"), not
// minutes — so the threshold is set there, wide enough to absorb a normal
// idle period without flagging one as a fault.
const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * @param {{ status: {error: true} | {pendingCount: number, oldestPendingAt: string|null, reportedAt: string|null} }} props
 */
export default function SyncStatusIndicator({ status }) {
  if (status.error) {
    return <Readout dotClass="bg-rubber-red" label="Can't reach backend" />;
  }

  const { pendingCount, oldestPendingAt, reportedAt } = status;

  let dotClass;
  let label;

  if (reportedAt === null) {
    dotClass = "bg-rubber-red";
    label = "Not yet synced";
  } else if (pendingCount > 0) {
    dotClass = "bg-signal-yellow";
    label = `${pendingCount} pending · oldest ${formatRelative(oldestPendingAt)}`;
  } else if (elapsedMs(reportedAt) > FRESH_WINDOW_MS) {
    dotClass = "bg-rubber-red";
    label = `Last synced ${formatRelative(reportedAt)}`;
  } else {
    dotClass = "bg-turf-green";
    label = `Synced ${formatRelative(reportedAt)}`;
  }

  return <Readout dotClass={dotClass} label={label} />;
}

function Readout({ dotClass, label }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 font-body text-xs text-steel-700">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
      {label}
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
