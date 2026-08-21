// Thin top bar per DESIGN.md's layout concept. Ported from
// server/src/components/TopBar.jsx.

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { UserRound } from "lucide-react-native";
import { useLiveQuery } from "../hooks/useLiveQuery.js";
import { getOnDesk } from "../domain/staff.js";
import OnDeskSheet from "./staff/OnDeskSheet.jsx";
import { colors } from "../theme/colors.js";

export default function TopBar() {
  const [pickerOpen, setPickerOpen] = useState(false);
  // undefined until the first read lands, so the bar never flashes "Not set"
  // at someone who is in fact signed in.
  const onDesk = useLiveQuery(() => getOnDesk(), []);

  return (
    <>
      <View className="h-12 shrink-0 flex-row items-center justify-between border-b border-steel-300 bg-surface-white px-4">
        <Text className="font-body text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-900">
          RackIn
        </Text>

        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          className="-mr-2 h-10 flex-row items-center gap-2 rounded-ds-sm px-2"
        >
          <UserRound size={16} strokeWidth={1.75} color={colors.steel700} />
          {onDesk === undefined ? (
            <Text className="font-body text-sm text-steel-700">{" "}</Text>
          ) : onDesk ? (
            <Text className="font-body text-sm text-steel-700">
              On desk: <Text className="font-semibold text-ink-900">{onDesk.name}</Text>
            </Text>
          ) : (
            // Stated plainly rather than nagged about. Nobody signed in is a
            // legitimate state — the front desk still works, records simply
            // carry no name, which is honest (PRD 4.10's spirit).
            <Text className="font-body text-sm text-steel-700">Set who's on desk</Text>
          )}
        </Pressable>
      </View>

      {pickerOpen && (
        <OnDeskSheet onDesk={onDesk ?? null} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}
