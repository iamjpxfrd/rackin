// S1 — Follow Up (frontend-spec.md §6.1).
//
// The screen the pilot is judged on: success is the owner ACTING on an
// entry, not merely acknowledging it (PRODUCT.md). Two sections answer one
// question — who needs a call today.
//
// Expiring soon sits above Stopped coming because it is the only one of the
// two where a phone call changes the outcome before it happens. A member
// qualifying for both appears in both: two different reasons to call, and
// de-duplicating would hide the more urgent one.

import { useLiveQuery } from "dexie-react-hooks";
import { getFollowUp } from "../../domain/followUp.js";
import { ScreenHeader, SectionHeader, EmptyState, Panel } from "../ui/Layout.jsx";
import UrgencyRow from "../ui/UrgencyRow.jsx";

function QuietRow({ children }) {
  return (
    <p className="rounded-ds-sm border border-steel-300 bg-surface-white px-4 py-4 font-body text-base text-steel-700">
      {children}
    </p>
  );
}

export default function FollowUpScreen({ onSelectMember, onRegisterFirst, hasMembers }) {
  // No default value: undefined is "not loaded", which must never render as
  // the empty state (frontend-spec.md §9).
  const data = useLiveQuery(() => getFollowUp());

  if (data === undefined) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ScreenHeader title="Follow Up" />
      </div>
    );
  }

  const { expiring, lapsed } = data;
  const total = expiring.length + lapsed.length;

  if (!hasMembers) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ScreenHeader title="Follow Up" />
        <div className="px-4">
          <EmptyState
            title="No members yet."
            hint="Members show up here once they're registered and their plan starts running down."
            action={
              <button
                type="button"
                onClick={onRegisterFirst}
                className="h-14 rounded-ds-sm border border-steel-300 bg-surface-white px-6 font-body text-base font-semibold text-steel-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
              >
                Register the first member
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ScreenHeader title="Follow Up" />
        <div className="px-4">
          <EmptyState
            title="Nobody needs a call today."
            hint="Members show up here when their plan is ending or they've stopped coming."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader
        title="Follow Up"
        meta={total === 1 ? "1 to call" : `${total} to call`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-4 pb-4 pt-2">
        <section className="flex flex-col gap-2">
          <SectionHeader count={expiring.length}>
            Expiring soon · next 7 days
          </SectionHeader>
          {expiring.length === 0 ? (
            <QuietRow>No one expiring in the next 7 days.</QuietRow>
          ) : (
            <Panel>
              {expiring.map((row) => (
                <UrgencyRow
                  key={row.member.id}
                  row={row}
                  mode="expiring"
                  onSelect={onSelectMember}
                />
              ))}
            </Panel>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <SectionHeader count={lapsed.length}>Stopped coming · 14+ days</SectionHeader>
          {lapsed.length === 0 ? (
            <QuietRow>No one&apos;s fallen off in the last 14 days.</QuietRow>
          ) : (
            <Panel>
              {lapsed.map((row) => (
                <UrgencyRow
                  key={row.member.id}
                  row={row}
                  mode="lapsed"
                  onSelect={onSelectMember}
                />
              ))}
            </Panel>
          )}
        </section>
      </div>
    </div>
  );
}
