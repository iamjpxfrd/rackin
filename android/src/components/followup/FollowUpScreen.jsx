// S1 — Follow Up (frontend-spec.md §6.1). Ported from
// server/src/components/followup/FollowUpScreen.jsx, reskinned to Kinetic
// Court. One real difference from the web version: no ScreenHeader ("Follow
// Up" title + "N to call" count) — the Kinetic Court mockup
// (PhoneFollowUp.dc.html) starts straight into the EXPIRING SOON section
// with no title row, since the tab bar already names the active tab and
// each section already shows its own count.
//
// onSelectMember is passed down from App.js, same as the web version — a
// row tap now opens the member's profile (Task 4).

import { ScrollView, Text, View } from "react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { getFollowUp } from "../../domain/followUp.js";
import { memberCount } from "../../domain/members.js";
import { SectionHeader, EmptyState, Panel } from "../ui/Layout.jsx";
import UrgencyRow from "../ui/UrgencyRow.jsx";

function QuietRow({ children }) {
  return (
    <View className="border border-border bg-card px-4 py-4">
      <Text className="font-body text-base text-muted">{children}</Text>
    </View>
  );
}

export default function FollowUpScreen({ onSelectMember }) {
  // No default value: undefined is "not loaded", which must never render as
  // the empty state (frontend-spec.md §9).
  const data = useLiveQuery(() => getFollowUp());
  const totalMembers = useLiveQuery(() => memberCount());
  const hasMembers = totalMembers === undefined || totalMembers > 0;

  if (data === undefined) {
    return <View className="flex-1 bg-page" />;
  }

  const { expiring, lapsed } = data;
  const total = expiring.length + lapsed.length;

  if (!hasMembers) {
    return (
      <View className="flex-1 bg-page p-4">
        <EmptyState
          title="No members yet."
          hint="Members show up here once they're registered and their plan starts running down."
        />
      </View>
    );
  }

  if (total === 0) {
    return (
      <View className="flex-1 bg-page p-4">
        <EmptyState
          title="Nobody needs a call today."
          hint="Members show up here when their plan needs renewing or they've stopped coming."
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="gap-6 p-4">
      <View className="gap-2.5">
        <SectionHeader count={expiring.length} accentCount>
          NEEDS RENEWAL
        </SectionHeader>
        {expiring.length === 0 ? (
          <QuietRow>No one needs a renewal call right now.</QuietRow>
        ) : (
          <Panel>
            {expiring.map((row, index) => (
              <UrgencyRow
                key={row.member.id}
                row={row}
                mode="expiring"
                onSelect={onSelectMember}
                isLast={index === expiring.length - 1}
              />
            ))}
          </Panel>
        )}
      </View>

      <View className="gap-2.5">
        <SectionHeader count={lapsed.length}>STOPPED COMING · 14+ DAYS</SectionHeader>
        {lapsed.length === 0 ? (
          <QuietRow>No one's fallen off in the last 14 days.</QuietRow>
        ) : (
          <Panel>
            {lapsed.map((row, index) => (
              <UrgencyRow
                key={row.member.id}
                row={row}
                mode="lapsed"
                onSelect={onSelectMember}
                isLast={index === lapsed.length - 1}
              />
            ))}
          </Panel>
        )}
      </View>
    </ScrollView>
  );
}
