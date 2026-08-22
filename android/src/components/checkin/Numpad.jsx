// The signature component (DESIGN.md "Numpad key"). Ported from
// server/src/components/checkin/Numpad.jsx, reskinned to Kinetic Court. CSS
// grid has no RN equivalent (Yoga is flexbox-only), so the 3-wide layout is
// built as explicit rows of flex-1 keys instead of grid-cols-3. The confirm
// key's diagonal-cut corner uses ui/DiagonalCut.jsx — see that file for why
// (no RN clip-path).
//
// Press feedback uses react-native-reanimated directly (already a project
// dependency via NativeWind) rather than Pressable's own `pressed` state:
// neither the `active:` className variant nor a style-as-function prop
// produced any visible change on-device, so this drives an explicit
// accent-colored overlay + scale pulse from shared values instead — nothing
// left for NativeWind or Pressable's state plumbing to silently swallow.
// The flash is a timed sequence (up, hold, fade) rather than tied to
// press/release, so it reads clearly even on a fast tap. The digit's own
// text color is never touched — only a translucent accent wash sits behind
// it, low enough opacity that white text stays readable through it.
//
// The hook that makes this work (usePressFlash) moved to ui/Touchable.jsx
// (2026-08-22) so every button in the app gets the same treatment, not just
// the numpad — this file just calls it now instead of defining its own copy.

import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Delete } from "lucide-react-native";
import { colors } from "../../theme/colors.js";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import { usePressFlash } from "../ui/Touchable.jsx";

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

function NumpadKey({ onPress, disabled, accessibilityLabel, children }) {
  const { trigger, scaleStyle, flashStyle } = usePressFlash();

  function handlePress() {
    if (disabled) return;
    trigger();
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="flex-1"
    >
      <Animated.View
        style={[scaleStyle, { opacity: disabled ? 0.5 : 1 }]}
        className="h-16 items-center justify-center border border-border bg-card"
      >
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.accent },
            flashStyle,
          ]}
        />
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function Numpad({
  value,
  onChange,
  onSubmit,
  disabled,
  label = "CHECK IN",
  placeholder = "Member #",
  maxLength = 6,
  mask = false,
}) {
  const confirm = usePressFlash();

  function pressDigit(digit) {
    onChange((value + digit).slice(0, maxLength));
  }

  function pressBackspace() {
    onChange(value.slice(0, -1));
  }

  function pressConfirm() {
    if (disabled || !value) return;
    confirm.trigger();
    onSubmit(value);
  }

  return (
    <View className="flex-col gap-3">
      <View
        className="h-16 items-center justify-center border border-border bg-card px-4"
        accessibilityLiveRegion="polite"
      >
        <Text className="font-display text-3xl text-white">
          {value ? (mask ? "•".repeat(value.length) : value) : <Text className="text-border">{placeholder}</Text>}
        </Text>
      </View>

      <View className="flex-col gap-2">
        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row gap-2">
            {row.map((key, keyIndex) =>
              key === "" ? (
                <View
                  key={`spacer-${rowIndex}-${keyIndex}`}
                  className="h-16 flex-1 border border-border bg-card"
                />
              ) : key === "⌫" ? (
                <NumpadKey key="backspace" onPress={pressBackspace} disabled={disabled} accessibilityLabel="Backspace">
                  <Delete size={26} strokeWidth={2} color={colors.textMuted} />
                </NumpadKey>
              ) : (
                <NumpadKey key={key} onPress={() => pressDigit(key)} disabled={disabled}>
                  <Text className="font-display text-3xl text-white">{key}</Text>
                </NumpadKey>
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
        <Animated.View style={confirm.scaleStyle}>
          <DiagonalCut
            color={disabled || !value ? colors.border : colors.accent}
            style={{ height: 62, width: "100%", alignItems: "center", justifyContent: "center" }}
          >
            <Text
              className="font-heading text-lg tracking-wider"
              style={{ color: disabled || !value ? colors.textMuted : colors.page }}
            >
              {label}
            </Text>
          </DiagonalCut>
        </Animated.View>
      </Pressable>
    </View>
  );
}
