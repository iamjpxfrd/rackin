// Members roster row (frontend-spec.md §6.2). Ported from
// server/src/components/ui/MemberRow.jsx, reskinned to Kinetic Court and
// matched to Members.dc.html/PhoneMembers.dc.html's roster row: a fixed id
// gutter, name, trailing status badge — no urgency gutter here, unlike
// Follow Up's UrgencyRow, since a roster carries no urgency number
// (frontend-spec.md §6.2 — that treatment stays on Follow Up).

import { Text, View } from "react-native";
import StatusBadge from "./StatusBadge.jsx";
import Touchable from "./Touchable.jsx";

export default function MemberRow({ row, onSelect, isLast = false }) {
  const { member, status, isExpiringSoon } = row;

  return (
    <Touchable
      onPress={() => onSelect(member.id)}
      className={`h-14 flex-row items-center gap-3 px-4 ${isLast ? "" : "border-b border-hairline"}`}
    >
      <Text className="w-14 shrink-0 font-body text-xs text-dim">#{member.id}</Text>
      <Text numberOfLines={1} className="min-w-0 flex-1 font-body-semibold text-base text-white">
        {member.name}
      </Text>
      <View className="shrink-0">
        <StatusBadge status={status} isExpiringSoon={isExpiringSoon} />
      </View>
    </Touchable>
  );
}
