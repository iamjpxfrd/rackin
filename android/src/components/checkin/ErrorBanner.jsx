// States the problem and the next action, no apology (DESIGN.md voice).
// Ported from server/src/components/checkin/ErrorBanner.jsx, reskinned to
// Kinetic Court.

import { Text, View } from "react-native";
import { TriangleAlert } from "lucide-react-native";
import { colors } from "../../theme/colors.js";

export default function ErrorBanner({ message }) {
  return (
    <View className="flex-row items-center gap-2 border border-danger/40 bg-danger/10 px-4 py-3">
      <TriangleAlert size={20} strokeWidth={1.75} color={colors.danger} />
      <Text className="flex-1 font-body text-base text-danger">{message}</Text>
    </View>
  );
}
