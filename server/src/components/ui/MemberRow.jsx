// Roster row (frontend-spec.md §6.2). No numeral gutter here — a roster
// carries no urgency number, and reserving that treatment for Follow Up is
// what keeps it meaningful.
//
// Fixed-width slots for the number and the badge so both form clean vertical
// lanes down a 128-row list, regardless of name length.

import StatusBadge from "./StatusBadge.jsx";

export default function MemberRow({ row, onSelect }) {
  const { member, status, isExpiringSoon } = row;

  return (
    <button
      type="button"
      onClick={() => onSelect(member.id)}
      className="flex h-14 items-center gap-4 border-b border-steel-300 px-4 text-left last:border-b-0 hover:bg-chalk-50 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-steel-700"
    >
      <span className="w-18 shrink-0 font-mono text-base text-steel-700">
        #{member.id}
      </span>
      <span className="min-w-0 flex-1 truncate font-body text-lg font-medium text-ink-900">
        {member.name}
      </span>
      <span className="flex w-40 shrink-0 justify-end">
        <StatusBadge status={status} isExpiringSoon={isExpiringSoon} />
      </span>
    </button>
  );
}
