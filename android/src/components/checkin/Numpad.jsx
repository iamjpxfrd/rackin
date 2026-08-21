// The signature component (DESIGN.md "Numpad key"). Ported from
// server/src/components/checkin/Numpad.jsx. CSS grid has no RN equivalent
// (Yoga is flexbox-only), so the 3-wide layout is built as explicit rows of
// flex-1 keys instead of grid-cols-3.

import { Pressable, Text, View } from "react-native";
import { Delete } from "lucide-react-native";
import { colors } from "../../theme/colors.js";

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
        className="h-16 items-center justify-center rounded-ds-sm border border-steel-300 bg-surface-white px-4"
        accessibilityLiveRegion="polite"
      >
        <Text className="font-numeral text-3xl text-ink-900">
          {value || <Text className="text-steel-300">Member #</Text>}
        </Text>
      </View>

      <View className="flex-col gap-3">
        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-3">
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
                  className="h-18 flex-1 items-center justify-center rounded-ds-sm border border-steel-300 bg-surface-white shadow-key-rest active:translate-y-0.5 active:shadow-key-pressed disabled:opacity-50"
                >
                  <Delete size={28} strokeWidth={1.75} color={colors.steel700} />
                </Pressable>
              ) : (
                <Pressable
                  key={key}
                  onPress={() => pressDigit(key)}
                  disabled={disabled}
                  accessibilityRole="button"
                  className="h-18 flex-1 items-center justify-center rounded-ds-sm border border-steel-300 bg-surface-white shadow-key-rest active:translate-y-0.5 active:shadow-key-pressed disabled:opacity-50"
                >
                  <Text className="font-numeral text-4xl text-ink-900">{key}</Text>
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
        className="h-18 w-full items-center justify-center rounded-ds-sm bg-signal-yellow shadow-key-rest active:translate-y-0.5 active:shadow-key-pressed disabled:bg-steel-300 disabled:shadow-none"
      >
        <Text className="font-body text-lg font-bold text-ink-900">CHECK IN</Text>
      </Pressable>
    </View>
  );
}
