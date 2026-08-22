// Bottom sheet used by Record Payment and OnDeskSheet (frontend-spec.md
// §6.4). Ported from server/src/components/ui/Sheet.jsx, reskinned to
// Kinetic Court. Two real differences from the web version:
//
//  - No focus trap / Escape handling: both are DOM keyboard-focus concepts
//    with no RN equivalent on a touchscreen kiosk with no hardware keyboard.
//    Backdrop tap and the close button cover the same dismissal need.
//  - The web version's CSS @keyframes slide-up is done with RN's core
//    Animated API instead — NativeWind has no CSS animation engine, and this
//    is a one-shot entrance, not worth pulling in reanimated for.

import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
// Aliased: this file already uses RN's own core Animated for the slide-up
// entrance (see the header comment) — reanimated's Animated.View is only
// for the close button's scale pulse (usePressFlash).
import ReanimatedAnimated from "react-native-reanimated";
import { X } from "lucide-react-native";
import { usePressFlash } from "./Touchable.jsx";
import { colors } from "../../theme/colors.js";

export default function Sheet({ title, subtitle, onClose, children }) {
  const translateY = useRef(new Animated.Value(16)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  // Borderless icon-only button — scale pulse only, same reasoning as every
  // other plain-surface control (Touchable.jsx's header).
  const closePress = usePressFlash();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity]);

  return (
    <View className="absolute inset-0 z-50">
      <Pressable
        className="absolute inset-0 bg-black/70"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View className="absolute inset-0 flex-col justify-end" pointerEvents="box-none">
        <Animated.View
          style={{ transform: [{ translateY }], opacity }}
          className="flex-col gap-5 border-t-2 border-hairline bg-card p-4 pt-6"
        >
          <View className="flex-row items-center justify-between gap-4">
            <View className="min-w-0 flex-1 flex-col gap-1">
              <Text className="font-heading text-xl text-white">{title}</Text>
              {subtitle && (
                <Text numberOfLines={1} className="font-body text-sm text-muted">
                  {subtitle}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                closePress.trigger();
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="h-14 w-14 shrink-0 items-center justify-center"
            >
              <ReanimatedAnimated.View style={closePress.scaleStyle}>
                <X size={22} strokeWidth={1.75} color={colors.textMuted} />
              </ReanimatedAnimated.View>
            </Pressable>
          </View>

          {children}
        </Animated.View>
      </View>
    </View>
  );
}
