// The live-updating equivalent of the old logbook page (PRD 4.4). Ported
// from server/src/components/checkin/ActivityFeed.jsx, reskinned to
// Kinetic Court — re-runs on every local write via useLiveQuery.js's global
// invalidation (see that file for why it's global rather than per-table,
// unlike the web version's Dexie liveQuery). Row layout (avatar, then
// name+member# together, then time trailing) matches the design session's
// on-canvas edit, not the original web layout (which led with time).

import { Image, ScrollView, Text, View } from "react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { getTodaysActivity } from "../../domain/checkIn.js";
import { formatTime } from "../../domain/constants.js";
import { Avatar } from "../ui/Avatar.jsx";

// Placeholder — swap the file, not the reference, once real artwork lands.
const NO_ACTIVITY_IMAGE = require("../../../assets/checkin/no-activity.png");

export default function ActivityFeed({ pinBottom = false }) {
  const activity = useLiveQuery(() => getTodaysActivity(), [], []);

  const label = (
    <Text className="font-heading text-[11px] tracking-[0.1em] text-muted">
      TODAY'S ACTIVITY
    </Text>
  );

  return (
    // Always flex-1: this is what settles the sibling mode content (numpad,
    // or the leading spacer below) against the opposite edge of the screen,
    // not a separate spacer in CheckInScreen. The empty state fills that
    // whole space itself either way (centered regardless of which edge it's
    // read from). The populated state's capped list needs a spacer on one
    // side to do the same — trailing by default (numpad mode: activity
    // leads, so the gap falls after the list, ahead of the numpad that
    // follows as a sibling); leading when `pinBottom` (search/QR: their
    // input comes first as a sibling, so the gap falls before the list,
    // pinning it to the bottom of the screen instead of trailing the input).
    <View className="flex-1 flex-col gap-2">
      {!pinBottom && label}

      {activity.length === 0 ? (
        <>
          {pinBottom && label}
          <View className="flex-1 items-center justify-center gap-3 border border-border bg-card">
            <Image source={NO_ACTIVITY_IMAGE} className="h-64 w-64" resizeMode="contain" />
            <Text className="text-center font-body text-base text-muted">
              Consistent as always. Impressive work!
            </Text>
          </View>
        </>
      ) : (
        <>
          {pinBottom && <View className="flex-1" />}
          {pinBottom && label}
          <View className="max-h-[190px] border border-border bg-card">
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
                  <Text className="w-[62px] text-right font-heading text-xs text-accent">
                    {formatTime(entry.timestamp)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
          {!pinBottom && <View className="flex-1" />}
        </>
      )}
    </View>
  );
}
