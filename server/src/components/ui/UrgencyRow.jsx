// The Follow Up row, per the desktop dashboard design canvas — the number
// IS the content: the owner is scanning a column of urgencies, not reading
// sentences. Only the single most-urgent gutter value (0/1 for expiring,
// "never" for lapsed) gets an accent color; every other value is plain
// white, so the accent stays reserved for what actually needs same-day
// attention.

import { planLabel } from "../../domain/constants.js";
import StatusBadge from "./StatusBadge.jsx";

/** Gutter contents for a member whose coverage is about to end. */
function expiringGutter(daysRemaining) {
  if (daysRemaining === 0) return { value: "0", caption: "today", urgent: true };
  if (daysRemaining === 1) return { value: "1", caption: "tomorrow", urgent: true };
  return { value: String(daysRemaining), caption: "days", urgent: false };
}

/** Gutter contents for a member who has stopped coming. */
function lapsedGutter(daysSinceVisit) {
  // Never visited: there is no number to show, and "never" is the more
  // useful fact anyway. Sorts to the top of the list as the oldest case.
  if (daysSinceVisit === null) return { value: "—", caption: "never", urgent: true };
  return { value: String(daysSinceVisit), caption: "days", urgent: false };
}

export default function UrgencyRow({ row, mode }) {
  const { member, status, isExpiringSoon } = row;
  const gutter =
    mode === "expiring"
      ? expiringGutter(row.daysRemaining)
      : lapsedGutter(row.daysSinceVisit);
  const gutterColor = !gutter.urgent ? "text-text" : mode === "expiring" ? "text-accent" : "text-danger";

  const plan = planLabel(member.planType);

  return (
    <div className="flex h-21 items-stretch border-b border-hairline last:border-b-0">
      <div className="flex w-[70px] shrink-0 flex-col items-center justify-center gap-0.5 border-r border-hairline">
        <span className={`font-heading text-[30px] leading-none ${gutterColor}`}>{gutter.value}</span>
        <span className="font-body text-[11px] text-text-muted">{gutter.caption}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4">
        <span className="truncate font-body text-base font-semibold text-text">{member.name}</span>
        <span className="font-body text-[13px] text-text-muted">
          {plan} · {member.phone ?? <span className="text-text-muted">no phone</span>}
        </span>
      </div>
      <div className="flex w-[130px] shrink-0 flex-col items-end justify-center gap-1.5 pr-4">
        <span className="font-body text-[13px] text-text-muted">#{member.id}</span>
        <StatusBadge status={status} isExpiringSoon={isExpiringSoon} />
      </div>
    </div>
  );
}
