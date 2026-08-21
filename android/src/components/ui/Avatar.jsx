// Circular initial badge — Kinetic Court's stand-in for a profile icon.
// Two variants: `variant="onDesk"` (solid lime, black initial — the top
// bar's "who's on desk" badge) and the default (dark card-colored circle,
// lime initial — used for each row in the activity feed).

import { Text, View } from "react-native";
import { colors } from "../../theme/colors.js";

export function Avatar({ name, size = 26, variant = "default" }) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  const isOnDesk = variant === "onDesk";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isOnDesk ? colors.accent : colors.border,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text
        className="font-numeral"
        style={{ fontSize: size * 0.42, color: isOnDesk ? colors.page : colors.accent }}
      >
        {initial}
      </Text>
    </View>
  );
}
