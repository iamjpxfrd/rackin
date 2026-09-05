// The Follow Up tab's two questions (frontend-spec.md §6.1, PRD 4.5/4.9),
// laid out as the desktop dashboard design canvas's two-column view instead
// of the tablet's single stacked list — the freed width holds both lists
// side by side rather than one scrolled after the other.

import { useEffect, useState } from "react";
import { getFollowUp } from "../../domain/followUp.js";
import { ScreenHeader, EmptyState, Card } from "../ui/Layout.jsx";
import UrgencyRow from "../ui/UrgencyRow.jsx";

export default function FollowUpScreen() {
  // No default value: undefined is "not loaded yet", which must not render as
  // the empty state.
  const [data, setData] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    getFollowUp()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData({ expiring: [], lapsed: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (data === undefined) return null;

  const { expiring, lapsed } = data;
  const total = expiring.length + lapsed.length;

  return (
    <div className="flex h-full flex-col gap-6">
      <ScreenHeader title="Follow Up" meta={`${total} to call`} />

      {data.error && (
        <EmptyState title="Couldn't load Follow Up." hint="Check the backend connection and try reloading." />
      )}

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-6">
        <Section title="Expiring Soon · Next 7 Days" count={expiring.length}>
          <FollowUpList rows={expiring} mode="expiring" empty="No one is expiring soon." />
        </Section>
        <Section title="Stopped Coming · 14+ Days" count={lapsed.length}>
          <FollowUpList rows={lapsed} mode="lapsed" empty="No one has lapsed." />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, count, children }) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between">
        <span className="font-body text-xs font-bold uppercase tracking-[0.12em] text-text-muted">{title}</span>
        <span className="font-heading text-sm text-accent">{count}</span>
      </div>
      <Card className="min-h-0 flex-1 overflow-auto !p-0">{children}</Card>
    </div>
  );
}

function FollowUpList({ rows, mode, empty }) {
  if (rows.length === 0) {
    // Centered in the full card, not pinned to the top — each column's card
    // fills the screen's remaining height, and a top-anchored message would
    // leave most of that height reading as an unstyled dead panel.
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-body text-sm text-text-muted">{empty}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {rows.map((row) => (
        <UrgencyRow key={row.member.id} row={row} mode={mode} />
      ))}
    </div>
  );
}
