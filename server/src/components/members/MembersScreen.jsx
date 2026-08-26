// S2 — Members (frontend-spec.md §6.2). The roster. Its job is lookup, not
// analysis: a flat name-ascending list with no pinned groups, so a name is
// always where the alphabet says it is. Expiring Soon lives on Follow Up.
//
// listMembers() now reads from the backend instead of local storage
// ([[Decisions/Web Becomes a Read-Only Dashboard]]), so this is a plain
// one-shot fetch rather than a live query. The "register the first member"
// empty-state action is gone with it — registration happens on android/ now.

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { listMembers, filterMembers } from "../../domain/members.js";
import { ScreenHeader, EmptyState, Panel } from "../ui/Layout.jsx";
import MemberRow from "../ui/MemberRow.jsx";

export default function MembersScreen({ onSelectMember }) {
  const [query, setQuery] = useState("");
  // No default: `undefined` means "not loaded yet", which must not render as
  // the empty state (frontend-spec.md §9). Only a confirmed [] does.
  const [rows, setRows] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    listMembers().then((result) => {
      if (!cancelled) setRows(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = rows === undefined;
  const matches = loading ? [] : filterMembers(rows, query);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader title="Members" meta={loading ? "" : `${rows.length} total`} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        <div className="flex h-16 shrink-0 items-center gap-3 rounded-ds-sm border border-steel-300 bg-surface-white px-4 focus-within:outline focus-within:outline-2 focus-within:outline-steel-700">
          <Search size={20} strokeWidth={1.75} className="shrink-0 text-steel-700" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or number"
            aria-label="Search members by name or number"
            autoComplete="off"
            className="w-full bg-transparent font-body text-lg text-ink-900 placeholder:text-steel-300 focus:outline-none"
          />
        </div>

        {loading ? null : rows.length === 0 ? (
          <EmptyState
            title="No members yet."
            hint="Members show up here once they've synced from the app."
          />
        ) : (
          <Panel>
            {matches.length === 0 ? (
              // Never a blank screen: the field stays, the reason is stated.
              <p className="px-4 py-6 text-center font-body text-base text-steel-700">
                No members match &ldquo;{query.trim()}&rdquo;.
              </p>
            ) : (
              matches.map((row) => (
                <MemberRow key={row.member.id} row={row} onSelect={onSelectMember} />
              ))
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
