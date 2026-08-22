// Thin top bar per DESIGN.md's layout concept. Ported from
// server/src/components/TopBar.jsx, reskinned to Kinetic Court
// (see [[Decisions/UI Port Uses NativeWind]]).

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useLiveQuery } from "../hooks/useLiveQuery.js";
import { useClock } from "../hooks/useClock.js";
import { getOnDesk } from "../domain/staff.js";
import { formatClock, formatDate } from "../domain/constants.js";
import OnDeskSheet from "./staff/OnDeskSheet.jsx";
import { Avatar } from "./ui/Avatar.jsx";
import { usePressFlash } from "./ui/Touchable.jsx";

export default function TopBar({ showClock = true }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // undefined until the first read lands, so the bar never flashes "Not set"
  // at someone who is in fact signed in.
  const onDesk = useLiveQuery(() => getOnDesk(), []);
  const now = useClock();
  // Borderless, no background of its own — scale pulse only, same as
  // MemberProfileScreen's Back button.
  const onDeskPress = usePressFlash();

  return (
    <>
      <View className="h-[52px] shrink-0 flex-row items-center justify-between border-b-2 border-hairline bg-page px-4">
        <Text className="font-display text-sm tracking-[0.06em] text-white">Jack's Gym</Text>

        <Pressable
          onPress={() => {
            onDeskPress.trigger();
            setPickerOpen(true);
          }}
          accessibilityRole="button"
        >
          <Animated.View
            style={[onDeskPress.scaleStyle, { flexDirection: "row", alignItems: "center", gap: 8 }]}
          >
            {onDesk === undefined ? (
              <Text className="font-body text-sm text-muted">{" "}</Text>
            ) : onDesk ? (
              <>
                <Avatar name={onDesk.name} variant="onDesk" />
                <Text className="font-body text-sm text-muted">{onDesk.name}</Text>
              </>
            ) : (
              // Stated plainly rather than nagged about. Nobody signed in is a
              // legitimate state — the front desk still works, records simply
              // carry no name, which is honest (PRD 4.10's spirit).
              <Text className="font-body text-sm text-muted">Who's on desk?</Text>
            )}
          </Animated.View>
        </Pressable>
      </View>

      {/* A live readout, not decoration — a control panel has a clock (DESIGN.md's
          "gym equipment control panel" north star). Ticks every second via
          useClock so it visibly reads as live rather than a static timestamp.
          Check-In only: the other tabs have their own content to lead with,
          and a clock that never changes screen to screen reads as clutter. */}
      {showClock && (
        <View className="h-10 shrink-0 flex-row items-center justify-center gap-2 border-b-2 border-hairline bg-page">
          <Text className="font-heading text-m tracking-[0.04em] text-white">
            {formatClock(now)}
          </Text>
          <Text className="font-body text-m text-dim">•</Text>
          <Text className="font-body text-m text-muted">{formatDate(now)}</Text>
        </View>
      )}

      {pickerOpen && (
        <OnDeskSheet onDesk={onDesk ?? null} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}
