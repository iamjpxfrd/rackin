// The Follow Up row (frontend-spec.md §6.1).
//
// The number IS the content: the owner is scanning a column of urgencies,
// not reading sentences. A fixed-width numeral gutter keeps that column
// aligned no matter how long the names beside it get, and the Arm's-Length
// Rule keeps the digits at Numeral scale (DESIGN.md).

import { planLabel } from "../../domain/constants.js";
import StatusBadge from "./StatusBadge.jsx";

/** Gutter contents for a member whose coverage is about to end. */
function expiringGutter(daysRemaining) {
  if (daysRemaining === 0) return { value: "0", caption: "today" };
  if (daysRemaining === 1) return { value: "1", caption: "tomorrow" };
  return { value: String(daysRemaining), caption: "days" };
}

/** Gutter contents for a member who has stopped coming. */
function lapsedGutter(daysSinceVisit) {
  // Never visited: there is no number to show, and "never" is the more
  // useful fact anyway. Sorts to the top of the list as the oldest case.
  if (daysSinceVisit === null) return { value: "—", caption: "never" };
  return { value: String(daysSinceVisit), caption: "days" };
}

export default function UrgencyRow({ row, mode, onSelect }) {
  const { member, status, isExpiringSoon } = row;
  const gutter =
    mode === "expiring"
      ? expiringGutter(row.daysRemaining)
      : lapsedGutter(row.daysSinceVisit);

  const plan = planLabel(member.planType);

  return (
    <button
      type="button"
      onClick={() => onSelect(member.id)}
      className="flex h-22 items-stretch border-b border-steel-300 text-left last:border-b-0 hover:bg-chalk-50 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-steel-700"
    >
      <span className="flex w-18 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-steel-300">
        <span className="font-numeral text-4xl leading-none text-ink-900">
          {gutter.value}
        </span>
        <span className="font-body text-[13px] text-steel-700">{gutter.caption}</span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4">
        <span className="truncate font-body text-lg font-medium text-ink-900">
          {member.name}
        </span>
        <span className="flex items-center gap-1.5 font-body text-sm text-steel-700">
          {plan} ·
          {member.phone ? (
            <span>{member.phone}</span>
          ) : (
            // An owner scanning for who to call needs to see instantly that
            // this one cannot be called.
            <span className="text-steel-300">no phone</span>
          )}
        </span>
      </span>

      <span className="flex w-44 shrink-0 flex-col items-end justify-center gap-1.5 pr-4">
        <span className="font-mono text-base text-steel-700">#{member.id}</span>
        <StatusBadge status={status} isExpiringSoon={isExpiringSoon} />
      </span>
    </button>
  );
}
