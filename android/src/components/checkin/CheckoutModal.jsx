// The activity list's checkout confirmation (Task 4) — designed on the
// Kinetic Court canvas as "Checkout Confirmation (phone)" alongside
// ConfirmDialog's "Confirm Delete" artboard, same shape and animation
// (centered overlay, scale+opacity entrance, dismiss-on-backdrop-tap — see
// ConfirmDialog.jsx/ConfirmationCard.jsx). Content is a small member
// profile instead of ConfirmDialog's generic icon+title+message: staff are
// deciding whether to log someone out, so the card leads with who they'd be
// logging out and how long that member has actually been in, not a
// yes/no prompt with a name buried in a sentence.

import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { formatDuration, formatTime } from "../../domain/constants.js";
import { colors } from "../../theme/colors.js";
import { PressableDiagonalCut } from "../ui/DiagonalCut.jsx";
import Touchable from "../ui/Touchable.jsx";

export default function CheckoutModal({ visible, entry, now, onConfirm, onCancel }) {
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

  if (!visible || !entry) return null;

  const initial = (entry.memberName?.trim()?.[0] ?? "?").toUpperCase();
  const duration = formatDuration(entry.timestamp, now.toISOString());

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
        className="w-full max-w-sm items-center gap-4 border-2 border-accent bg-card p-7"
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text className="font-heading" style={{ fontSize: 27, color: colors.accent }}>
            {initial}
          </Text>
        </View>

        <View className="items-center gap-1">
          <Text className="text-center font-heading text-xl text-white">{entry.memberName}</Text>
          <Text className="text-center font-body text-sm text-muted">
            Checked in at {formatTime(entry.timestamp)}
          </Text>
        </View>

        <View className="items-center gap-0.5">
          <Text className="font-heading text-[11px] tracking-[0.1em] text-muted">
            CHECKED IN FOR
          </Text>
          <Text className="font-heading text-3xl text-accent">{duration}</Text>
        </View>

        <View className="w-full flex-row gap-2.5">
          <Touchable
            onPress={onCancel}
            wrapperClassName="flex-1"
            className="h-[52px] items-center justify-center border border-border bg-card"
          >
            <Text className="font-heading text-sm tracking-wide text-muted">CANCEL</Text>
          </Touchable>
          <PressableDiagonalCut
            onPress={onConfirm}
            accessibilityLabel={`Log out ${entry.memberName}`}
            color={colors.accent}
            cutPercent={88}
            // Fixed pixel height, not "100%" — see ConfirmDialog.jsx's
            // matching comment for why a percentage doesn't resolve here.
            wrapperStyle={{ height: 52, flex: 1 }}
            style={{ height: 52, width: "100%", alignItems: "center", justifyContent: "center" }}
          >
            <Text className="font-heading text-sm tracking-wide text-page">LOG OUT</Text>
          </PressableDiagonalCut>
        </View>
      </Animated.View>
    </View>
  );
}
