// Follow Up's status chip (DESIGN.md: color is never the only signal, so
// every state pairs a color with a text label). Ported from
// server/src/components/ui/StatusBadge.jsx, reskinned to Kinetic Court:
// EXPIRING is a solid lime fill (matches the same treatment used for
// EXPIRING on the design canvas's Follow Up mockup); EXPIRED and ACTIVE are
// a colored dot + text with no fill, so the one truly urgent state (lime
// fill) reads as the loudest thing in the row.

import { Text, View } from "react-native";
import { colors } from "../../theme/colors.js";

const VARIANTS = {
  expiring: { label: "EXPIRING", fill: true },
  expired: { label: "EXPIRED", color: colors.danger },
  active: { label: "ACTIVE", color: colors.textMuted },
};

/**
 * @param {{ status: "active"|"expired", isExpiringSoon?: boolean }} props
 */
export default function StatusBadge({ status, isExpiringSoon = false }) {
  const key = status === "active" && isExpiringSoon ? "expiring" : status === "active" ? "active" : "expired";
  const variant = VARIANTS[key];

  if (variant.fill) {
    return (
      <View className="bg-accent px-2 py-[3px]">
        <Text className="font-heading text-[10px] text-page">{variant.label}</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1">
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: variant.color }} />
      <Text className="font-heading text-[10px]" style={{ color: variant.color }}>
        {variant.label}
      </Text>
    </View>
  );
}
