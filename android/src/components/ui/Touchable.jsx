// Shared press feedback, extracted from Numpad.jsx's key-flash treatment
// (2026-08-22) so every button in the app gets the same touch indicator,
// not just the numpad.
//
// Uses react-native-reanimated directly rather than Pressable's own
// `pressed` state or NativeWind's `active:` variant: neither produced any
// visible change on this RN/NativeWind stack (Numpad.jsx's original header
// comment), so this drives an explicit scale pulse + accent flash from
// shared values instead — nothing left for NativeWind or Pressable's state
// plumbing to silently swallow. The flash is a timed sequence (up, hold,
// fade) rather than tied to press/release, so it reads clearly even on a
// fast tap.
//
// Two ways to use it:
//  - `usePressFlash()` directly, for a button whose shape a rectangular
//    overlay wouldn't match (a DiagonalCut button, ChoiceGroup's selected
//    pill) — apply `scaleStyle` to the whole shape and skip `flashStyle`,
//    the same "scale only" treatment Numpad's own CHECK IN button already
//    used before this file existed.
//  - `<Touchable>` as a drop-in Pressable replacement for anything with a
//    plain rectangular surface (a bordered tile, a pill, a list row) — it
//    wraps both the scale pulse and an accent flash overlay for you.

import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../../theme/colors.js";

export function usePressFlash() {
  const scale = useSharedValue(1);
  const flash = useSharedValue(0);

  function trigger() {
    scale.value = withSequence(withTiming(0.96, { duration: 60 }), withTiming(1, { duration: 120 }));
    flash.value = withSequence(
      withTiming(0.4, { duration: 60 }),
      withDelay(90, withTiming(0, { duration: 220 })),
    );
  }

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return { trigger, scaleStyle, flashStyle };
}

/**
 * Drop-in Pressable replacement for a rectangular surface — a bordered
 * tile, a pill, a list row. Not for a DiagonalCut shape or anything else a
 * rectangular flash overlay wouldn't match; use `usePressFlash()` directly
 * there instead (see the file header).
 *
 * `className`/`style` are the visible box's own layout (height, padding,
 * border, flex-direction, …) — they go on the INNER animated view, the one
 * the flash overlay actually covers. `wrapperClassName`/`wrapperStyle` are
 * for the outer Pressable instead, only needed when this sits in a flex
 * row/column and has to claim its own share of it (e.g. `flex-1` for an
 * equal-width tab or pill) — a plain Pressable with no size of its own
 * would otherwise just shrink to fit its child instead of matching siblings.
 */
export default function Touchable({
  onPress,
  disabled,
  flashColor = colors.accent,
  style,
  className,
  wrapperStyle,
  wrapperClassName,
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityState,
  children,
}) {
  const { trigger, scaleStyle, flashStyle } = usePressFlash();

  function handlePress() {
    if (disabled) return;
    trigger();
    onPress?.();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      className={wrapperClassName}
      style={wrapperStyle}
    >
      <Animated.View style={[scaleStyle, { opacity: disabled ? 0.5 : 1 }, style]} className={className}>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: flashColor },
            flashStyle,
          ]}
        />
        {children}
      </Animated.View>
    </Pressable>
  );
}
