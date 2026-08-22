// The one moment of celebration in an otherwise purely functional app
// (DESIGN.md). Ported from server/src/components/checkin/ConfirmationCard.jsx,
// reskinned to Kinetic Court. The web version's CSS @keyframes scale-in
// becomes RN's core Animated API — see Sheet.jsx for the same reasoning.

import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { CheckCircle2, RotateCcw } from "lucide-react-native";
import { formatTime } from "../../domain/constants.js";
import { colors } from "../../theme/colors.js";

const AUTO_DISMISS_MS = 2500;

export default function ConfirmationCard({
  member,
  visitCountThisMonth,
  alreadyCheckedInAt = null,
  onDismiss,
}) {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss, scale, opacity]);

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/70 p-6">
      <Pressable
        className="absolute inset-0"
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      />
      <Animated.View
        style={{ transform: [{ scale }], opacity }}
        className="w-full max-w-sm items-center border-2 border-accent bg-card p-8"
      >
        <CheckCircle2 size={40} strokeWidth={1.75} color={colors.accent} />
        <Text className="mt-4 text-center font-heading text-2xl text-white">
          Checked in — {member.name}
        </Text>
        <Text className="mt-2 text-center font-heading text-base text-accent">
          Visit {visitCountThisMonth} this month
        </Text>

        {/* Still a success, so it keeps the tick rather than becoming a
            warning card: the visit was recorded. This only names what staff
            might not have realised, which is almost always a double tap and
            occasionally a genuine second session. */}
        {alreadyCheckedInAt && (
          <View className="mt-3 flex-row items-center justify-center gap-1.5">
            <RotateCcw size={16} strokeWidth={1.75} color={colors.textMuted} />
            <Text className="font-body text-base text-muted">
              Already checked in at {formatTime(alreadyCheckedInAt)}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}
