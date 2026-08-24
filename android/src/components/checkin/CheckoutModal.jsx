// The activity list's checkout confirmation (Task 4) — designed on the
// Kinetic Court canvas as "Checkout Confirmation (phone)" alongside
// ConfirmDialog's "Confirm Delete" artboard, same shape and animation
// (centered overlay, scale+opacity entrance, dismiss-on-backdrop-tap — see
// ConfirmDialog.jsx/ConfirmationCard.jsx). Content is a small member
// profile instead of ConfirmDialog's generic icon+title+message: staff are
// deciding whether to log someone out, so the card leads with who they'd be
// logging out and how long that member has actually been in, not a
// yes/no prompt with a name buried in a sentence.
//
// Real RN `Modal` now (2026-08-22, was a plain absolute-positioned View):
// ActivityFeed renders this from inside Today's Present's own box, and a
// hand-rolled `absolute inset-0` only escapes as far as its nearest real
// parent View — it was covering the activity card, not the numpad/search/QR
// controls below it or the tab bar, so a tap there still reached whatever
// was underneath. RN's native Modal renders in its own top-level window
// host regardless of where it's mounted in the component tree, which is
// exactly the "block everything else" behavior a confirmation needs — no
// need to lift checkoutTarget state up to CheckInScreen just to get there.
// Also enlarged per explicit follow-up request.

import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { formatDurationMs, formatTime } from "../../domain/constants.js";
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

  if (!entry) return null;

  const initial = (entry.memberName?.trim()?.[0] ?? "?").toUpperCase();
  // Today's running total, not just this segment - matches
  // ActivityFeed.jsx's displayDurationMs and the whole point of the
  // 2026-08-25 follow-up: a member who stepped out and came back should
  // see the checkout confirmation reflect the whole day, not just the
  // time since they walked back in.
  const duration = formatDurationMs(
    (entry.bankedMs ?? 0) + (now.getTime() - new Date(entry.timestamp).getTime()),
  );

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
              Checked in at {formatTime(entry.timestamp)}
            </Text>
          </View>

          <View className="items-center gap-1">
            {/* "TODAY'S TOTAL" rather than "CHECKED IN FOR" - the number
                above can include earlier visits today, which would read as
                a mismatch against "Checked in at {time}" if it were still
                labeled as this one segment's own length. */}
            <Text className="font-heading text-xs tracking-[0.1em] text-muted">
              TODAY'S TOTAL
            </Text>
            <Text className="font-heading text-5xl text-accent">{duration}</Text>
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
              accessibilityLabel={`Log out ${entry.memberName}`}
              color={colors.accent}
              cutPercent={88}
              // Fixed pixel height, not "100%" — see ConfirmDialog.jsx's
              // matching comment for why a percentage doesn't resolve here.
              wrapperStyle={{ height: 58, flex: 1 }}
              style={{ height: 58, width: "100%", alignItems: "center", justifyContent: "center" }}
            >
              <Text className="font-heading text-base tracking-wide text-page">LOG OUT</Text>
            </PressableDiagonalCut>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
