// S2 — Members (frontend-spec.md §6.2). Ported from
// server/src/components/members/MembersScreen.jsx, reskinned to Kinetic
// Court and matched to PhoneMembers.dc.html: a search field, a "N MEMBERS"
// count on its own line, then a flat roster with no pinned groups —
// Expiring Soon lives on Follow Up, not here.
//
// Sort control added 2026-08-22: listMembers() still returns name-ascending
// (its documented default), but staff can flip the roster to newest-first
// here — a client-side re-sort, not a domain concern, so filterMembers's
// contract (and the newest-registered-member use case Follow Up-adjacent
// screens don't cover) stays untouched.
//
// onSelectMember/onRegisterFirst are passed down from App.js, same as the
// web version — a row tap opens the member's profile (Task 4).

import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { listMembers, filterMembers } from "../../domain/members.js";
import { EmptyState, Panel } from "../ui/Layout.jsx";
import MemberRow from "../ui/MemberRow.jsx";
import { colors } from "../../theme/colors.js";

const SORTS = {
  name: { label: "NAME", compare: (a, b) => a.member.name.localeCompare(b.member.name) },
  newest: {
    label: "NEWEST",
    compare: (a, b) => b.member.createdAt.localeCompare(a.member.createdAt),
  },
};

export default function MembersScreen({ onSelectMember, onRegisterFirst }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  // No default value: undefined means "not loaded yet", which must never
  // render as the empty state (frontend-spec.md §9). Only a confirmed [] does.
  const rows = useLiveQuery(() => listMembers());

  const loading = rows === undefined;
  const matches = loading ? [] : [...filterMembers(rows, query)].sort(SORTS[sortBy].compare);

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
          action={
            <Pressable
              onPress={onRegisterFirst}
              accessibilityRole="button"
              className="h-14 items-center justify-center border border-border bg-page px-6"
            >
              <Text className="font-body-semibold text-base text-muted">
                Register the first member
              </Text>
            </Pressable>
          }
        />
      ) : (
        <>
          <View className="h-8 flex-row items-center justify-between">
            <Text className="font-heading text-[11px] tracking-[0.1em] text-muted">
              {rows.length} MEMBERS
            </Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Sort" className="flex-row gap-1.5">
              {Object.entries(SORTS).map(([key, { label }]) => {
                const selected = sortBy === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSortBy(key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    className={`h-6 items-center justify-center px-2.5 ${
                      selected ? "bg-accent" : "border border-border"
                    }`}
                  >
                    <Text
                      className={`font-heading text-[10px] ${selected ? "text-page" : "text-muted"}`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

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
                  onSelect={onSelectMember}
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
