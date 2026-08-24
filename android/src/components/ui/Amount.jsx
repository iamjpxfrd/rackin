// A small peso icon next to every displayed amount (2026-08-25 follow-up).
// `constants.js`'s CURRENCY_SYMBOL is deliberately blank — no currency is
// committed anywhere in the repo (frontend-spec.md §11 OD-2) — so a bare
// number like "800" didn't read as money at a glance. This is a display-only
// affordance: the icon is rendered fresh from `formatAmount()` on every
// paint, same as the text next to it — it's never part of a form value, an
// input, or anything written to the database, and doesn't touch
// CURRENCY_SYMBOL itself (that's still an open product decision).
import { Text, View } from "react-native";
import { PhilippinePeso } from "lucide-react-native";
import { formatAmount } from "../../domain/constants.js";
import { colors } from "../../theme/colors.js";

export default function Amount({
  value,
  prefix = "",
  textClassName,
  wrapperClassName = "",
  color = colors.textPrimary,
  iconSize = 13,
}) {
  return (
    <View className={`flex-row items-center gap-1 ${wrapperClassName}`}>
      <PhilippinePeso size={iconSize} strokeWidth={2} color={color} />
      <Text className={textClassName} style={{ color }}>
        {prefix}
        {formatAmount(value)}
      </Text>
    </View>
  );
}
