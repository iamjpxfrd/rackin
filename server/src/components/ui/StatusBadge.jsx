// Status badge, per the desktop dashboard design canvas: Active/Expired are
// a colored dot + colored text; Expiring Soon is a solid lime chip with dark
// text — the one state the owner should act on fastest gets the highest-
// emphasis treatment instead of matching the other two's quieter dot style.

/**
 * @param {{ status: "active"|"expired", isExpiringSoon?: boolean }} props
 */
export default function StatusBadge({ status, isExpiringSoon = false }) {
  if (status === "active" && isExpiringSoon) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 bg-accent px-2.5 py-1">
        <span className="font-heading text-[11px] uppercase tracking-[0.06em] text-page">Expiring</span>
      </span>
    );
  }

  const isActive = status === "active";
  const color = isActive ? "text-accent" : "text-danger";
  const dot = isActive ? "bg-accent" : "bg-danger";

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 font-heading text-[11px] font-bold uppercase tracking-[0.06em] ${color}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {isActive ? "Active" : "Expired"}
    </span>
  );
}
