// A brief, non-blocking confirmation for actions that currently have no
// feedback at all (e.g. staff-list changes) — distinct from ErrorBanner
// (inline, check-in flow errors) and ConfirmationCard (the app's one
// designed celebratory moment), neither of which this replaces.
//
// Not ToastAndroid: that API is Android-only and no-ops on iOS, which this
// Expo app also targets. This is a small custom overlay instead, using the
// same react-native-reanimated shared-value pattern as Numpad's press
// feedback — Pressable/NativeWind state proved unreliable for visible
// feedback on this stack (see Numpad.jsx's header comment).
//
// Mounted once at the app root (ToastHost) so `showToast()` works from
// anywhere, including sheets that close before a toast's timer finishes.

import { useEffect, useState } from "react";
import { Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { colors } from "../../theme/colors.js";

const VISIBLE_MS = 2200;
const FADE_MS = 200;

let notify = null;

/**
 * Show a brief toast. `type` picks the accent stripe: "success" (default,
 * accent lime) or "warning" (danger red) — never used for check-in errors
 * or sync failures, which have their own dedicated, PRD-governed UI.
 */
export function showToast(message, type = "success") {
  notify?.(message, type);
}

export function ToastHost() {
  const [toast, setToast] = useState(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    notify = (message, type) => {
      setToast({ message, type });
      translateY.value = 8;
      opacity.value = withSequence(
        withTiming(1, { duration: FADE_MS }),
        withDelay(
          VISIBLE_MS,
          withTiming(0, { duration: FADE_MS }, (finished) => {
            if (finished) runOnJS(setToast)(null);
          }),
        ),
      );
      translateY.value = withTiming(0, { duration: FADE_MS });
    };
    return () => {
      notify = null;
    };
  }, [opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  const stripeColor = toast.type === "warning" ? colors.danger : colors.accent;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 80,
          zIndex: 100,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: 3,
          borderLeftColor: stripeColor,
          backgroundColor: colors.card,
          paddingVertical: 12,
          paddingHorizontal: 14,
        },
        style,
      ]}
    >
      <Text className="font-body text-base text-white">{toast.message}</Text>
    </Animated.View>
  );
}
