// Persistent, always-visible tab bar (app-flow.md §1, DESIGN.md
// "One-Tap-Away Rule"). Ported from server/src/components/TabBar.jsx,
// reskinned to Kinetic Court. "Store" has no real screen yet — see the
// Store / daily cash ledger feature proposal in Task 3 — so it lands on the
// same "not yet ported" placeholder as the other unbuilt tabs; it's in the
// bar because the design already put it there and pulling it back out
// would just mean re-adding it later.

import { Pressable, Text, View } from "react-native";
import { CalendarCheck, PhoneCall, Users, UserPlus, ShoppingBag } from "lucide-react-native";
import { colors } from "../theme/colors.js";

const TABS = [
  { id: "checkin", label: "Check-In", icon: CalendarCheck },
  { id: "followup", label: "Follow Up", icon: PhoneCall },
  { id: "members", label: "Members", icon: Users },
  { id: "new", label: "New", icon: UserPlus },
  { id: "store", label: "Store", icon: ShoppingBag },
];

export default function TabBar({ active, onChange }) {
  return (
    <View className="h-16 shrink-0 flex-row border-t-2 border-hairline bg-black">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        const cell = (
          <View className="flex-1 items-center justify-center gap-1">
            <Icon size={26} strokeWidth={1.75} color={isActive ? colors.accent : colors.textDim} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              className={`font-heading text-[10px] ${
                isActive ? "text-accent" : "text-dim"
              }`}
            >
              {tab.label}
            </Text>
          </View>
        );
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            className="flex-1"
          >
            {isActive ? (
              <View className="flex-1" style={{ borderTopWidth: 2, borderTopColor: colors.accent, marginTop: -2 }}>
                {cell}
              </View>
            ) : (
              cell
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
