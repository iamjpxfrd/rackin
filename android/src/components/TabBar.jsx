// Persistent, always-visible tab bar (app-flow.md §1, DESIGN.md
// "One-Tap-Away Rule"). Ported from server/src/components/TabBar.jsx,
// reskinned to Kinetic Court. All five tabs have real screens as of Task 4's
// Store build — see domain/store.js and components/store/.

import { Text, View } from "react-native";
import { CalendarCheck, PhoneCall, Users, UserPlus, ShoppingBag, TicketPlus } from "lucide-react-native";
import Touchable from "./ui/Touchable.jsx";
import { colors } from "../theme/colors.js";

const TABS = [
  { id: "checkin", label: "Check-In", icon: CalendarCheck },
  { id: "followup", label: "Follow Up", icon: PhoneCall },
  { id: "members", label: "Members", icon: Users },
  { id: "new", label: "New Member", icon: TicketPlus },
  { id: "store", label: "Store", icon: ShoppingBag },
];

function TabBarItem({ tab, isActive, onPress }) {
  const Icon = tab.icon;
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      wrapperClassName="flex-1"
      style={
        isActive
          ? { flex: 1, borderTopWidth: 2, borderTopColor: colors.accent, marginTop: -2 }
          : { flex: 1 }
      }
    >
      <View className="flex-1 items-center justify-center gap-1">
        <Icon size={26} strokeWidth={1.75} color={isActive ? colors.accent : colors.textDim} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          className={`font-heading text-[10px] ${isActive ? "text-accent" : "text-dim"}`}
        >
          {tab.label}
        </Text>
      </View>
    </Touchable>
  );
}

export default function TabBar({ active, onChange }) {
  return (
    <View className="h-16 shrink-0 flex-row border-t-2 border-hairline bg-black">
      {TABS.map((tab) => (
        <TabBarItem key={tab.id} tab={tab} isActive={tab.id === active} onPress={() => onChange(tab.id)} />
      ))}
    </View>
  );
}
