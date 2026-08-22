// The Follow Up row (frontend-spec.md §6.1). Ported from
// server/src/components/ui/UrgencyRow.jsx, reskinned to Kinetic Court and
// matched to the PhoneFollowUp.dc.html mockup's phone layout (a fixed
// numeral gutter, name + plan/phone, trailing status chip) — not the
// desktop mockup's three-column layout, since the app only ports the phone
// screens (see PhoneCheckIn.dc.html -> CheckInScreen.jsx for the same
// pattern).
//
// One deliberate content deviation from the mockup: the mockup's sample
// data shows the member ID in the subtitle line ("Monthly · #1017"). This
// screen's whole purpose is knowing who to call (PRODUCT.md), so the
// subtitle shows the phone number instead (falling back to "no phone"),
// matching the web version's actual behavior — the ID isn't the actionable
// fact here.

import { Pressable, Text, View } from "react-native";
import { planLabel } from "../../domain/constants.js";
import StatusBadge from "./StatusBadge.jsx";
import { colors } from "../../theme/colors.js";

/** Gutter contents for a member whose coverage is about to end. */
function expiringGutter(daysRemaining) {
  if (daysRemaining === 0) return { value: "0", caption: "today", color: colors.accent };
  if (daysRemaining === 1) return { value: "1", caption: "tomorrow", color: colors.accent };
  return { value: String(daysRemaining), caption: "days", color: colors.textPrimary };
}

/** Gutter contents for a member who has stopped coming. */
function lapsedGutter(daysSinceVisit) {
  // Never visited: there is no number to show, and "never" is the more
  // useful fact anyway. Sorts to the top of the list as the oldest case.
  if (daysSinceVisit === null) return { value: "—", caption: "never", color: colors.danger };
  return { value: String(daysSinceVisit), caption: "days", color: colors.textPrimary };
}

export default function UrgencyRow({ row, mode, onSelect, isLast = false }) {
  const { member, status, isExpiringSoon } = row;
  const gutter =
    mode === "expiring" ? expiringGutter(row.daysRemaining) : lapsedGutter(row.daysSinceVisit);
  const plan = planLabel(member.planType);

  return (
    <Pressable
      onPress={() => onSelect(member.id)}
      accessibilityRole="button"
      className={`h-[72px] flex-row items-stretch ${isLast ? "" : "border-b border-hairline"}`}
    >
      <View className="w-[52px] shrink-0 items-center justify-center gap-[1px] border-r border-hairline">
        <Text className="font-heading text-2xl leading-none" style={{ color: gutter.color }}>
          {gutter.value}
        </Text>
        <Text className="text-[9px] text-muted">{gutter.caption}</Text>
      </View>

      <View className="min-w-0 flex-1 justify-center gap-0.5 px-3">
        <Text numberOfLines={1} className="font-body-semibold text-sm text-white">
          {member.name}
        </Text>
        <Text numberOfLines={1} className="font-body text-[11px] text-muted">
          {plan} · {member.phone || "no phone"}
        </Text>
      </View>

      <View className="shrink-0 flex-row items-center pr-3">
        <StatusBadge status={status} isExpiringSoon={isExpiringSoon} />
      </View>
    </Pressable>
  );
}
