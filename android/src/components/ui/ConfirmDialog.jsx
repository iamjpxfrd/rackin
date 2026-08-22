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
import { DiagonalCut } from "./DiagonalCut.jsx";
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
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            className="h-[52px] flex-1 items-center justify-center border border-border bg-card"
          >
            <Text className="font-heading text-sm tracking-wide text-muted">
              {cancelLabel}
            </Text>
          </Pressable>
          <Pressable onPress={onConfirm} accessibilityRole="button" className="h-[52px] flex-1">
            <DiagonalCut
              color={colors.danger}
              cutPercent={88}
              style={{ height: "100%", width: "100%", alignItems: "center", justifyContent: "center" }}
            >
              <Text className="font-heading text-sm tracking-wide text-page">
                {confirmLabel}
              </Text>
            </DiagonalCut>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
