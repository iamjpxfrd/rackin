// Re-check-in confirmation for an already-checked-out activity row (Task 6).
// Same visual shape as CheckoutModal.jsx — centered overlay, scale+opacity
// entrance, dismiss-on-backdrop-tap, member avatar+name leading the card —
// deliberately the same pattern rather than a new one, since staff are
// making the same kind of decision (act on this specific visit) either way.
//
// Shows when the member checked out and today's running total so far, then
// a CHECK IN action that reopens this same day's row (domain/checkIn.js's
// checkInMember, 2026-08-25 follow-up — a member who steps out and comes
// back stays one entry in the list, picking up from where they left off
// rather than starting a fresh clock) — going through the same blocking
// rules (expired membership, etc.) rather than a special-cased bypass. A
// rejection (e.g. EXPIRED) surfaces as a toast and leaves the modal open,
// matching CheckInScreen's own handleCheckIn error handling, rather than an
// inline banner — this is a lightweight confirm, not a form with values to
// protect.

import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { formatDurationMs, formatTime } from "../../domain/constants.js";
import { colors } from "../../theme/colors.js";
import { PressableDiagonalCut } from "../ui/DiagonalCut.jsx";
import Touchable from "../ui/Touchable.jsx";

export default function CheckInAgainModal({ visible, entry, onConfirm, onCancel }) {
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

  if (!entry) return null;

  const initial = (entry.memberName?.trim()?.[0] ?? "?").toUpperCase();
  // bankedMs already is today's full total — checkOutMember folds each
  // closing segment into it, so this needs nothing added (same value
  // ActivityFeed.jsx's displayDurationMs shows for this checked-out row).
  const totalToday = formatDurationMs(entry.bankedMs ?? 0);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/55 p-6">
        <Pressable
          className="absolute inset-0"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        />
        <Animated.View
          style={{ transform: [{ scale }], opacity }}
          className="w-full max-w-md items-center gap-5 border-2 border-accent bg-card p-9"
        >
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text className="font-heading" style={{ fontSize: 36, color: colors.accent }}>
              {initial}
            </Text>
          </View>

          <View className="items-center gap-1.5">
            <Text className="text-center font-heading text-2xl text-white">{entry.memberName}</Text>
            <Text className="text-center font-body text-base text-muted">
              Checked out at {formatTime(entry.checkOutAt)}
            </Text>
          </View>

          <View className="items-center gap-1">
            <Text className="font-heading text-xs tracking-[0.1em] text-muted">
              TODAY'S TOTAL SO FAR
            </Text>
            <Text className="font-heading text-5xl text-accent">{totalToday}</Text>
          </View>

          <View className="w-full flex-row gap-3">
            <Touchable
              onPress={onCancel}
              wrapperClassName="flex-1"
              className="h-[58px] items-center justify-center border border-border bg-card"
            >
              <Text className="font-heading text-base tracking-wide text-muted">CANCEL</Text>
            </Touchable>
            <PressableDiagonalCut
              onPress={onConfirm}
              accessibilityLabel={`Check in ${entry.memberName} again`}
              color={colors.accent}
              cutPercent={88}
              wrapperStyle={{ height: 58, flex: 1 }}
              style={{ height: 58, width: "100%", alignItems: "center", justifyContent: "center" }}
            >
              <Text className="font-heading text-base tracking-wide text-page">CHECK IN</Text>
            </PressableDiagonalCut>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
