// The signature component (DESIGN.md "Numpad key"). Ported from
// server/src/components/checkin/Numpad.jsx, reskinned to Kinetic Court. CSS
// grid has no RN equivalent (Yoga is flexbox-only), so the 3-wide layout is
// built as explicit rows of flex-1 keys instead of grid-cols-3. The confirm
// key's diagonal-cut corner uses ui/DiagonalCut.jsx — see that file for why
// (no RN clip-path).

import { Pressable, Text, View } from "react-native";
import { Delete } from "lucide-react-native";
import { colors } from "../../theme/colors.js";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export default function Numpad({ value, onChange, onSubmit, disabled }) {
  function pressDigit(digit) {
    if (disabled) return;
    onChange((value + digit).slice(0, 6));
  }

  function pressBackspace() {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }

  function pressConfirm() {
    if (disabled || !value) return;
    onSubmit(value);
  }

  return (
    <View className="flex-col gap-3">
      <View
        className="h-16 items-center justify-center border border-border bg-card px-4"
        accessibilityLiveRegion="polite"
      >
        <Text className="font-numeral text-3xl text-white">
          {value || <Text className="text-border">Member #</Text>}
        </Text>
      </View>

      <View className="flex-col gap-2">
        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-2">
            {row.map((key, keyIndex) =>
              key === "" ? (
                <View key={`spacer-${rowIndex}-${keyIndex}`} className="flex-1" />
              ) : key === "⌫" ? (
                <Pressable
                  key="backspace"
                  onPress={pressBackspace}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel="Backspace"
                  className="h-16 flex-1 items-center justify-center border border-border bg-card disabled:opacity-50"
                >
                  <Delete size={26} strokeWidth={2} color={colors.textMuted} />
                </Pressable>
              ) : (
                <Pressable
                  key={key}
                  onPress={() => pressDigit(key)}
                  disabled={disabled}
                  accessibilityRole="button"
                  className="h-16 flex-1 items-center justify-center border border-border bg-card disabled:opacity-50"
                >
                  <Text className="font-numeral text-3xl text-white">{key}</Text>
                </Pressable>
              ),
            )}
          </View>
        ))}
      </View>

      <Pressable
        onPress={pressConfirm}
        disabled={disabled || !value}
        accessibilityRole="button"
        className="w-full"
      >
        <DiagonalCut
          color={disabled || !value ? colors.border : colors.accent}
          style={{ height: 62, width: "100%", alignItems: "center", justifyContent: "center" }}
        >
          <Text
            className="font-body text-lg font-extrabold tracking-wider"
            style={{ color: disabled || !value ? colors.textMuted : colors.page }}
          >
            CHECK IN
          </Text>
        </DiagonalCut>
      </Pressable>
    </View>
  );
}
