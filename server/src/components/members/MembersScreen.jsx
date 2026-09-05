// S2 — Members (frontend-spec.md §6.2). The roster. Its job is lookup, not
// analysis: a flat name-ascending list with no pinned groups, so a name is
// always where the alphabet says it is. Expiring Soon lives on Follow Up.
//
// Desktop layout per the design canvas: a single full-width table with the
// search field inline with the header, no detail panel — getMemberProfile()
// is still a TODO stub that always returns null (domain/members.js), so
// there's no full profile to preview yet; a row here is just a row.

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { listMembers, filterMembers } from "../../domain/members.js";
import { planLabel } from "../../domain/constants.js";
import { ScreenHeader, EmptyState, Card } from "../ui/Layout.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";

export default function MembersScreen() {
  const [query, setQuery] = useState("");
  // No default: `undefined` means "not loaded yet", which must not render as
  // the empty state (frontend-spec.md §9). Only a confirmed [] does.
  const [rows, setRows] = useState(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listMembers()
      .then((result) => {
        if (!cancelled) setRows(result);
      })
      .catch(() => {
        // getJson throws on a non-2xx response or a transport failure.
        // Without this, a network failure leaves `rows` stuck at undefined
        // forever — "loading" never resolves, and the table below renders
        // its header with zero rows and no explanation, forever, rather
        // than an honest "couldn't load" state.
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = rows === undefined && !error;
  const matches = loading || error ? [] : filterMembers(rows, query);

  return (
    <div className="flex h-full flex-col gap-6">
      <ScreenHeader title="Members" meta={loading || error ? "" : `${rows.length} members`}>
        <div className="flex h-12 w-[340px] items-center gap-2.5 border border-border bg-surface px-4 focus-within:border-accent">
          <Search size={18} strokeWidth={1.75} className="shrink-0 text-text-dim" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or member #"
            aria-label="Search members by name or number"
            autoComplete="off"
            className="w-full bg-transparent font-body text-[15px] text-text placeholder:text-text-muted focus:outline-none"
          />
        </div>
      </ScreenHeader>

      {error ? (
        <EmptyState title="Couldn't load Members." hint="Check the backend connection and try reloading." />
      ) : !loading && rows.length === 0 ? (
        <EmptyState
          title="No members yet."
          hint="Members show up here once they've synced from the app."
        />
      ) : (
        <Card className="min-h-0 flex-1 overflow-auto !p-0">
          {matches.length === 0 && !loading ? (
            // Centered in the full card, not pinned to the top — the card
            // fills the screen's remaining height, and a top-anchored
            // message would leave most of that height reading as an
            // unstyled dead panel.
            <div className="flex h-full items-center justify-center">
              <p className="font-body text-sm text-text-muted">
                No members match &ldquo;{query.trim()}&rdquo;.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse font-body text-sm">
              <thead>
                <tr>
                  {["No.", "Name", "Plan", "Status"].map((h, i) => (
                    <th
                      key={h}
                      className={`border-b border-border bg-page px-5 pb-2.5 pt-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-text-muted ${
                        i === 3 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.map((row) => (
                  <tr key={row.member.id} className="h-15 border-b border-hairline last:border-b-0">
                    <td className="px-5 text-text-muted">#{row.member.id}</td>
                    <td className="px-5 text-[17px] font-semibold text-text">{row.member.name}</td>
                    <td className="px-5 text-text-muted">{planLabel(row.member.planType)}</td>
                    <td className="px-5 text-right">
                      <span className="inline-flex justify-end">
                        <StatusBadge status={row.status} isExpiringSoon={row.isExpiringSoon} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
