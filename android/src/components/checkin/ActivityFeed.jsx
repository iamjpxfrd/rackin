// The live-updating equivalent of the old logbook page (PRD 4.4). Ported
// from server/src/components/checkin/ActivityFeed.jsx, reskinned to
// Kinetic Court — re-runs on every local write via useLiveQuery.js's global
// invalidation (see that file for why it's global rather than per-table,
// unlike the web version's Dexie liveQuery). Row layout (avatar, then
// name+member# together, then time trailing) matches the design session's
// on-canvas edit, not the original web layout (which led with time).
//
// Task 4 checkout pass: the populated card is now flex-1, same as the empty
// state's placeholder box, so the list's border always reaches whatever
// sits below it (the numpad, or the bottom of the screen) instead of
// stopping short at a fixed max-height with a bare gap underneath. That
// symmetry also retired the `pinBottom` prop entirely — every caller now
// gets the same "label, then a box that fills the rest" layout, so Search's
// activity list sits right under the search input with a normal gap
// instead of being pinned to the very bottom of the screen.

import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { useClock } from "../../hooks/useClock.js";
import { getTodaysActivity, checkOutMember } from "../../domain/checkIn.js";
import { formatDuration } from "../../domain/constants.js";
import { Avatar } from "../ui/Avatar.jsx";
import CheckoutModal from "./CheckoutModal.jsx";

// Placeholder — swap the file, not the reference, once real artwork lands.
const NO_ACTIVITY_IMAGE = require("../../../assets/checkin/no-activity.png");

export default function ActivityFeed() {
  const activity = useLiveQuery(() => getTodaysActivity(), [], []);
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  // Ticks the still-checked-in rows' durations forward every second — a
  // frozen "42m" next to someone mid-session would read as broken, not
  // just stale (matches TopBar's live clock for the same reason).
  const now = useClock();

  async function confirmCheckout() {
    const target = checkoutTarget;
    setCheckoutTarget(null);
    if (target) await checkOutMember(target.id);
  }

  return (
    <View className="flex-1 flex-col gap-2">
      <Text className="font-heading text-[11px] tracking-[0.1em] text-muted">
        TODAY'S PRESENT
      </Text>

      {activity.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 border border-border bg-card">
          <Image source={NO_ACTIVITY_IMAGE} className="h-64 w-64" resizeMode="contain" />
          <Text className="text-center font-body text-base text-muted">
            Consistent as always. Impressive work!
          </Text>
        </View>
      ) : (
        <View className="flex-1 border border-border bg-card">
          <ScrollView>
            {activity.map((entry, index) => {
              const checkedOut = Boolean(entry.checkOutAt);
              const duration = formatDuration(entry.timestamp, entry.checkOutAt ?? now.toISOString());
              const row = (
                <View
                  className={`h-[52px] flex-row items-center gap-2.5 px-3.5 ${
                    index < activity.length - 1 ? "border-b border-hairline" : ""
                  } ${checkedOut ? "opacity-50" : ""}`}
                >
                  <Avatar name={entry.memberName} size={24} />
                  <Text numberOfLines={1} className="flex-1 font-body text-sm text-white">
                    {entry.memberName}
                    <Text className="w-12 text-[11px] text-dim"> #{entry.memberId}</Text>
                  </Text>
                  <Text
                    className={`w-[62px] text-right font-heading text-xs ${
                      checkedOut ? "text-muted" : "text-accent"
                    }`}
                  >
                    {duration}
                  </Text>
                </View>
              );

              // Only a still-checked-in row can be checked out — a finished
              // session has nothing left to confirm.
              return checkedOut ? (
                <View key={entry.id}>{row}</View>
              ) : (
                <Pressable
                  key={entry.id}
                  onPress={() => setCheckoutTarget(entry)}
                  accessibilityRole="button"
                  accessibilityLabel={`Check out ${entry.memberName}`}
                >
                  {row}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <CheckoutModal
        visible={Boolean(checkoutTarget)}
        entry={checkoutTarget}
        now={now}
        onConfirm={confirmCheckout}
        onCancel={() => setCheckoutTarget(null)}
      />
    </View>
  );
}
