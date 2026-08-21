// The live-updating equivalent of the old logbook page (PRD 4.4). Ported
// from server/src/components/checkin/ActivityFeed.jsx — re-runs on every
// local write via useLiveQuery.js's global invalidation (see that file for
// why it's global rather than per-table, unlike the web version's Dexie
// liveQuery).

import { ScrollView, Text, View } from "react-native";
import { Hash, ScanLine, Search } from "lucide-react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { getTodaysActivity } from "../../domain/checkIn.js";
import { formatTime } from "../../domain/constants.js";
import { colors } from "../../theme/colors.js";

const METHOD_ICON = { numpad: Hash, qr: ScanLine, search: Search };

export default function ActivityFeed() {
  const activity = useLiveQuery(() => getTodaysActivity(), [], []);

  return (
    <View className="h-full flex-col">
      <View className="px-1 pb-3">
        <Text className="font-body text-[13px] font-semibold uppercase tracking-[0.08em] text-steel-700">
          Today's Activity
        </Text>
      </View>

      <View className="flex-1 rounded-ds-sm border border-steel-300 bg-surface-white">
        {activity.length === 0 ? (
          <Text className="p-6 text-center font-body text-base text-steel-700">
            No check-ins yet today.
          </Text>
        ) : (
          <ScrollView>
            {activity.map((entry) => {
              const MethodIcon = METHOD_ICON[entry.method] ?? Hash;
              return (
                <View
                  key={entry.id}
                  className="h-14 flex-row items-center gap-3 border-b border-steel-300 px-4"
                >
                  {/* Wide enough for "10:02 AM" and non-wrapping so the meridiem
                      can never drop under the number; right aligned so the
                      colons line up down the column. */}
                  <Text className="w-20 shrink-0 text-right font-mono text-sm text-steel-700">
                    {formatTime(entry.timestamp)}
                  </Text>
                  <Text className="w-14 shrink-0 font-mono text-sm text-steel-700">
                    #{entry.memberId}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="flex-1 font-body text-base text-ink-900"
                  >
                    {entry.memberName}
                  </Text>
                  <MethodIcon size={18} strokeWidth={1.75} color={colors.steel700} />
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
