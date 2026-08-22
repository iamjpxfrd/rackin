// A centered "are you sure?" prompt for destructive actions — distinct from
// Sheet.jsx (a bottom-sheet form) and ConfirmationCard.jsx (the app's one
// celebratory success moment, accent-bordered). This is danger-only by
// design: a red-bordered card with a trash icon, a muted CANCEL and a
// diagonal-cut danger CONFIRM button, matching the Kinetic Court canvas's
// "Confirm Delete" artboard. Entrance animation ported from
// ConfirmationCard.jsx's same scale+opacity approach.

import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { PressableDiagonalCut } from "./DiagonalCut.jsx";
import Touchable from "./Touchable.jsx";
import { colors } from "../../theme/colors.js";

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "REMOVE",
  cancelLabel = "CANCEL",
  onConfirm,
  onCancel,
}) {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.96);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/55 p-6">
      <Pressable
        className="absolute inset-0"
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
      />
      <Animated.View
        style={{ transform: [{ scale }], opacity }}
        className="w-full max-w-sm items-center gap-4 border-2 border-danger bg-card p-7"
      >
        <Trash2 size={40} strokeWidth={1.75} color={colors.danger} />

        <View className="items-center gap-1.5">
          <Text className="text-center font-heading text-xl text-white">{title}</Text>
          <Text className="text-center font-body text-sm text-muted">{message}</Text>
        </View>

        <View className="w-full flex-row gap-2.5">
          <Touchable
            onPress={onCancel}
            wrapperClassName="flex-1"
            className="h-[52px] items-center justify-center border border-border bg-card"
          >
            <Text className="font-heading text-sm tracking-wide text-muted">
              {cancelLabel}
            </Text>
          </Touchable>
          <PressableDiagonalCut
            onPress={onConfirm}
            color={colors.danger}
            cutPercent={88}
            // A fixed pixel height here, not "100%": the animated wrapper in
            // between has no height of its own to resolve a percentage
            // against (Yoga can't resolve percentage-height against an
            // auto-height parent) — width still works as "100%" because the
            // wrapper's WIDTH comes from cross-axis stretch, a different
            // layout path that doesn't have this problem.
            wrapperStyle={{ height: 52, flex: 1 }}
            style={{ height: 52, width: "100%", alignItems: "center", justifyContent: "center" }}
          >
            <Text className="font-heading text-sm tracking-wide text-page">
              {confirmLabel}
            </Text>
          </PressableDiagonalCut>
        </View>
      </Animated.View>
    </View>
  );
}
