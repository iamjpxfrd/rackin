// Status badge (DESIGN.md). Color is never the only signal — every badge
// pairs its color with a text label, so status survives a glance under
// variable front-desk lighting.

const VARIANTS = {
  active: {
    label: "Active",
    className: "bg-turf-green/12 text-turf-green",
    dot: "bg-turf-green",
  },
  expired: {
    label: "Expired",
    className: "bg-rubber-red/12 text-rubber-red",
    dot: "bg-rubber-red",
  },
  expiring: {
    label: "Expiring soon",
    // Yellow is fill-only behind dark text — as text it fails contrast.
    className: "bg-signal-yellow/16 text-ink-900",
    dot: null,
  },
};

/**
 * @param {{ status: "active"|"expired", isExpiringSoon?: boolean }} props
 */
export default function StatusBadge({ status, isExpiringSoon = false }) {
  const variant =
    status === "active" && isExpiringSoon
      ? VARIANTS.expiring
      : VARIANTS[status] ?? VARIANTS.expired;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-ds-sm px-2.5 py-1 font-body text-sm font-medium ${variant.className}`}
    >
      {variant.dot && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${variant.dot}`} aria-hidden="true" />
      )}
      {variant.label}
    </span>
  );
}
