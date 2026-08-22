// S2 — Members (frontend-spec.md §6.2). Ported from
// server/src/components/members/MembersScreen.jsx, reskinned to Kinetic
// Court and matched to PhoneMembers.dc.html: a search field, a "N MEMBERS"
// count on its own line, then a flat name-ascending roster with no pinned
// groups — Expiring Soon lives on Follow Up, not here.
//
// onSelectMember has nowhere to navigate yet (the member profile screen
// isn't ported — Task 4), so a row tap shows a toast instead of a dead tap
// target, the same treatment FollowUpScreen uses. onRegisterFirst is
// dropped for the same reason (+New isn't ported either).

import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { listMembers, filterMembers } from "../../domain/members.js";
import { SectionHeader, EmptyState, Panel } from "../ui/Layout.jsx";
import MemberRow from "../ui/MemberRow.jsx";
import { colors } from "../../theme/colors.js";
import { showToast } from "../ui/Toast.jsx";

export default function MembersScreen() {
  const [query, setQuery] = useState("");
  // No default value: undefined means "not loaded yet", which must never
  // render as the empty state (frontend-spec.md §9). Only a confirmed [] does.
  const rows = useLiveQuery(() => listMembers());

  const loading = rows === undefined;
  const matches = loading ? [] : filterMembers(rows, query);

  function handleSelect() {
    showToast("Member profiles aren't ported yet", "warning");
  }

  if (loading) {
    return <View className="flex-1 bg-page" />;
  }

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="gap-3 p-4">
      <View className="h-14 flex-row items-center gap-2.5 border border-border bg-card px-4">
        <Search size={18} strokeWidth={1.75} color={colors.textDim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or #"
          placeholderTextColor={colors.textDim}
          className="flex-1 bg-transparent font-body text-base text-white"
        />
      </View>

      {rows.length === 0 ? (
        <EmptyState
          title="No members yet."
          hint="Register the first member from the + New tab."
        />
      ) : (
        <>
          <SectionHeader>{rows.length} MEMBERS</SectionHeader>

          {matches.length === 0 ? (
            <Text className="px-4 py-6 text-center font-body text-base text-muted">
              No members match "{query.trim()}".
            </Text>
          ) : (
            <Panel>
              {matches.map((row, index) => (
                <MemberRow
                  key={row.member.id}
                  row={row}
                  onSelect={handleSelect}
                  isLast={index === matches.length - 1}
                />
              ))}
            </Panel>
          )}
        </>
      )}
    </ScrollView>
  );
}
