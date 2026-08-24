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
// Status filter added the same day: ALL/ACTIVE/EXPIRED(+EXPIRING) options,
// filtering on each row's already-derived `status` (membership.js's
// deriveStatus) — no new domain query, same client-side-filter approach as
// the sort control and the search box.
//
// EXPIRING here is deliberately scoped to just this tab, and deliberately
// narrower than the app-wide "Expiring Soon" (EXPIRING_WITHIN_DAYS = 7,
// used by Follow Up and StatusBadge's EXPIRING chip everywhere else): a
// member only matches this filter on the actual last day of their coverage
// (daysRemaining === 0), by explicit request (2026-08-22) — Follow Up's
// wider early-warning window is untouched.
//
// Plan filter added the same day: ALL/SESSION/WEEKLY/MONTHLY/ANNUALLY,
// same client-side approach, filtering on member.planType.
//
// Both filter groups were first laid out as two rows of pills directly on
// the screen; consolidated same-day into one FILTER icon opening a sheet
// (Sort already used the icon+sheet pattern) once status+plan pushed the
// header down two extra rows — the sheet scales to more filter groups later
// without eating vertical space the roster needs.
//
// Filter icon doubles as reset (2026-08-22, replacing a separate "Reset
// filters" link inside the sheet): once a filter is active, the icon shows
// the accent dot, and tapping it again clears both groups straight back to
// ALL instead of reopening the sheet — the common re-tap once a filter's on
// is "show me everyone again," not "let me look at the sheet."
//
// onSelectMember/onRegisterFirst are passed down from App.js, same as the
// web version — a row tap opens the member's profile (Task 4).

import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Search, SlidersHorizontal } from "lucide-react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { listMembers, filterMembers } from "../../domain/members.js";
import { PLAN_TYPES, planLabel } from "../../domain/constants.js";
import { EmptyState, Panel, SectionHeader } from "../ui/Layout.jsx";
import MemberRow from "../ui/MemberRow.jsx";
import Sheet from "../ui/Sheet.jsx";
import Touchable from "../ui/Touchable.jsx";
import { colors } from "../../theme/colors.js";

const SORTS = {
  name: { label: "NAME", compare: (a, b) => a.member.name.localeCompare(b.member.name) },
  newest: {
    label: "NEWEST",
    compare: (a, b) => b.member.createdAt.localeCompare(a.member.createdAt),
  },
};

const STATUS_FILTERS = [
  { key: "all", label: "ALL", matches: () => true },
  { key: "active", label: "ACTIVE", matches: (row) => row.status === "active" },
  {
    key: "expiring",
    label: "EXPIRING",
    matches: (row) => row.status === "active" && row.daysRemaining === 0,
  },
  { key: "expired", label: "EXPIRED", matches: (row) => row.status === "expired" },
];

const PLAN_FILTERS = [
  { key: "all", label: "ALL" },
  ...PLAN_TYPES.map((planType) => ({ key: planType, label: planLabel(planType).toUpperCase() })),
];

/** A row of equal-width selectable pills — shared by the status and plan groups inside FilterSheet. */
function FilterPills({ label, options, value, onChange }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-1.5">
      {options.map(({ key, label: optionLabel }) => {
        const selected = value === key;
        return (
          <Touchable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            wrapperClassName="flex-1"
            className={`h-11 min-w-[76px] items-center justify-center px-3 ${
              selected ? "bg-accent" : "border border-border bg-page"
            }`}
          >
            <Text className={`font-heading text-xs ${selected ? "text-page" : "text-muted"}`}>
              {optionLabel}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

/** NAME/NEWEST sort toggle pill — its own component so each gets its own press-feedback shared values. */
function SortPill({ label, selected, onPress }) {
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`h-6 items-center justify-center px-2.5 ${selected ? "bg-accent" : "border border-border"}`}
    >
      <Text className={`font-heading text-[10px] ${selected ? "text-page" : "text-muted"}`}>{label}</Text>
    </Touchable>
  );
}

export default function MembersScreen({ active = true, onSelectMember, onRegisterFirst }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  // No default value: undefined means "not loaded yet", which must never
  // render as the empty state (frontend-spec.md §9). Only a confirmed [] does.
  const rows = useLiveQuery(() => listMembers());

  // Clears in-progress input on leaving the tab (2026-08-25 follow-up), same
  // reasoning as CheckInScreen's numpad/search reset below — a typed search
  // shouldn't still be sitting there next time staff open Members. Sort/
  // status/plan filters are left alone: those read as a chosen view, not
  // something someone was mid-typing, so they're worth keeping.
  useEffect(() => {
    if (!active) {
      setQuery("");
      setFilterSheetOpen(false);
    }
  }, [active]);

  const loading = rows === undefined;
  const statusMatch = STATUS_FILTERS.find((entry) => entry.key === statusFilter).matches;
  const filtered = loading
    ? []
    : rows.filter(
        (row) => statusMatch(row) && (planFilter === "all" || row.member.planType === planFilter),
      );
  const matches = loading ? [] : [...filterMembers(filtered, query)].sort(SORTS[sortBy].compare);
  const filtersActive = statusFilter !== "all" || planFilter !== "all";

  function handleFilterPress() {
    if (filtersActive) {
      setStatusFilter("all");
      setPlanFilter("all");
    } else {
      setFilterSheetOpen(true);
    }
  }

  if (loading) {
    return <View className="flex-1 bg-page" />;
  }

  return (
    <View className="flex-1 bg-page">
      <ScrollView contentContainerClassName="gap-3 p-4">
        <View className="flex-row gap-2.5">
          <View className="h-14 flex-1 flex-row items-center gap-2.5 border border-border bg-card px-4">
            <Search size={18} strokeWidth={1.75} color={colors.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name or #"
              placeholderTextColor={colors.textDim}
              className="flex-1 bg-transparent font-body text-base text-white"
            />
          </View>

          <Touchable
            onPress={handleFilterPress}
            accessibilityLabel={filtersActive ? "Reset filters" : "Filter"}
            wrapperClassName="shrink-0"
            className="h-14 w-14 items-center justify-center border border-border bg-card"
          >
            <SlidersHorizontal
              size={18}
              strokeWidth={1.75}
              color={filtersActive ? colors.accent : colors.textDim}
            />
            {filtersActive && (
              <View
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.accent,
                }}
              />
            )}
          </Touchable>
        </View>

        {rows.length === 0 ? (
          <EmptyState
            title="No members yet."
            hint="Register the first member from the + New tab."
            action={
              <Touchable
                onPress={onRegisterFirst}
                className="h-14 items-center justify-center border border-border bg-page px-6"
              >
                <Text className="font-body-semibold text-base text-muted">
                  Register the first member
                </Text>
              </Touchable>
            }
          />
        ) : (
          <>
            <View className="h-8 flex-row items-center justify-between">
              <Text className="font-heading text-[11px] tracking-[0.1em] text-muted">
                {matches.length} MEMBERS
              </Text>
              <View accessibilityRole="radiogroup" accessibilityLabel="Sort" className="flex-row gap-1.5">
                {Object.entries(SORTS).map(([key, { label }]) => (
                  <SortPill key={key} label={label} selected={sortBy === key} onPress={() => setSortBy(key)} />
                ))}
              </View>
            </View>

            {matches.length === 0 ? (
              <Text className="px-4 py-6 text-center font-body text-base text-muted">
                {query.trim() ? `No members match "${query.trim()}".` : "No members match this filter."}
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

      {filterSheetOpen && (
        <Sheet title="Filter members" onClose={() => setFilterSheetOpen(false)}>
          <View className="gap-2">
            <SectionHeader>STATUS</SectionHeader>
            <FilterPills
              label="Filter by status"
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </View>
          <View className="gap-2">
            <SectionHeader>PLAN</SectionHeader>
            <FilterPills
              label="Filter by plan"
              options={PLAN_FILTERS}
              value={planFilter}
              onChange={setPlanFilter}
            />
          </View>
        </Sheet>
      )}
    </View>
  );
}
