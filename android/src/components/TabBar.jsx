// Persistent, always-visible tab bar (app-flow.md §1, DESIGN.md
// "One-Tap-Away Rule"). Ported from server/src/components/TabBar.jsx.

import { Pressable, Text, View } from "react-native";
import { Hash, PhoneCall, Users, UserPlus } from "lucide-react-native";
import { colors } from "../theme/colors.js";

// "Lapsed" named a state; the tab now holds two (expiring soon + stopped
// coming) and one job. "Follow Up" names the job — and the pilot's success
// condition is the owner acting on it (frontend-spec.md §5.2).
const TABS = [
  { id: "checkin", label: "Check-In", icon: Hash },
  { id: "followup", label: "Follow Up", icon: PhoneCall },
  { id: "members", label: "Members", icon: Users },
  { id: "new", label: "+ New", icon: UserPlus },
];

export default function TabBar({ active, onChange }) {
  return (
    <View className="h-16 shrink-0 flex-row border-t border-steel-300 bg-chalk-50">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            className={`flex-1 flex-col items-center justify-center gap-1 border-t-2 ${
              isActive ? "border-signal-yellow" : "border-transparent"
            }`}
          >
            <Icon size={22} strokeWidth={1.75} color={isActive ? colors.ink900 : colors.steel700} />
            <Text
              className={`font-body text-xs ${
                isActive ? "font-semibold text-ink-900" : "text-steel-700"
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
