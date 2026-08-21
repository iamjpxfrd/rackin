// The live-updating equivalent of the old logbook page (PRD 4.4). Ported
// from server/src/components/checkin/ActivityFeed.jsx, reskinned to
// Kinetic Court — re-runs on every local write via useLiveQuery.js's global
// invalidation (see that file for why it's global rather than per-table,
// unlike the web version's Dexie liveQuery). Row layout (avatar, then
// name+member# together, then time trailing) matches the design session's
// on-canvas edit, not the original web layout (which led with time).

import { ScrollView, Text, View } from "react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { getTodaysActivity } from "../../domain/checkIn.js";
import { formatTime } from "../../domain/constants.js";
import { Avatar } from "../ui/Avatar.jsx";

export default function ActivityFeed() {
  const activity = useLiveQuery(() => getTodaysActivity(), [], []);

  return (
    <View className="flex-col gap-2">
      <Text className="font-body text-[11px] font-bold tracking-[0.1em] text-muted">
        TODAY'S ACTIVITY
      </Text>

      <View className="max-h-[190px] border border-border bg-card">
        {activity.length === 0 ? (
          <Text className="p-6 text-center font-body text-base text-muted">
            No check-ins yet today.
          </Text>
        ) : (
          <ScrollView>
            {activity.map((entry, index) => (
              <View
                key={entry.id}
                className={`h-[52px] flex-row items-center gap-2.5 px-3.5 ${
                  index < activity.length - 1 ? "border-b border-hairline" : ""
                }`}
              >
                <Avatar name={entry.memberName} size={24} />
                <Text numberOfLines={1} className="flex-1 font-body text-sm text-white">
                  {entry.memberName}
                  <Text className="w-12 text-[11px] text-dim"> #{entry.memberId}</Text>
                </Text>
                <Text className="w-[62px] text-right font-numeral text-xs text-accent">
                  {formatTime(entry.timestamp)}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
