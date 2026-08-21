// Thin top bar per DESIGN.md's layout concept. Ported from
// server/src/components/TopBar.jsx, reskinned to Kinetic Court
// (see [[Decisions/UI Port Uses NativeWind]]).

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLiveQuery } from "../hooks/useLiveQuery.js";
import { getOnDesk } from "../domain/staff.js";
import OnDeskSheet from "./staff/OnDeskSheet.jsx";
import { Avatar } from "./ui/Avatar.jsx";

export default function TopBar() {
  const [pickerOpen, setPickerOpen] = useState(false);
  // undefined until the first read lands, so the bar never flashes "Not set"
  // at someone who is in fact signed in.
  const onDesk = useLiveQuery(() => getOnDesk(), []);

  return (
    <>
      <View className="h-[52px] shrink-0 flex-row items-center justify-between border-b-2 border-hairline bg-page px-4">
        <Text className="font-numeral text-sm tracking-[0.06em] text-white">RACKIN</Text>

        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          className="flex-row items-center gap-2"
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
            <Text className="font-body text-sm text-muted">Set who's on desk</Text>
          )}
        </Pressable>
      </View>

      {pickerOpen && (
        <OnDeskSheet onDesk={onDesk ?? null} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}
