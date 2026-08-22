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
//
// Active/checked-out treatment (2026-08-22): rows are grouped, not just
// timestamp-ordered — everyone still on the premises sits above everyone
// who's checked out, each group keeping getTodaysActivity's own most-recent-
// first order by default. A still-active row gets a solid accent fill (dark
// text for contrast, the same "text goes dark on lime" rule as
// DiagonalCut/ChoiceGroup's selected state). Checked-out rows keep their
// original treatment (plain card background, opacity-50) — an "ash" fill
// was tried and dropped per explicit feedback; only the active state gets
// a color.
//
// Sort control added the same day: RECENT (the above default, most-recent
// check-in first within each group) or DURATION — within each group,
// longest-running first. For checked-out rows that's their final duration,
// highest to lowest, per explicit request; active rows get the same
// treatment for consistency (longest-currently-checked-in first), which
// wasn't separately specified but follows the same logic. The grouping
// itself (active always above checked-out) holds in both modes.

import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { ArrowUpDown } from "lucide-react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { useClock } from "../../hooks/useClock.js";
import { getTodaysActivity, checkOutMember } from "../../domain/checkIn.js";
import { formatDuration, formatTime } from "../../domain/constants.js";
import { Avatar } from "../ui/Avatar.jsx";
import Touchable from "../ui/Touchable.jsx";
import CheckoutModal from "./CheckoutModal.jsx";
import { colors } from "../../theme/colors.js";

// Placeholder — swap the file, not the reference, once real artwork lands.
const NO_ACTIVITY_IMAGE = require("../../../assets/checkin/no-activity.png");

// Secondary text sitting on the solid accent fill (matches ChoiceGroup.jsx's
// ACCENT_MUTED) — a dark olive rather than pure black, so it reads as
// "muted" without disappearing against lime.
const ACCENT_MUTED = "#3a4a10";

function durationMs(entry, now) {
  const end = entry.checkOutAt ?? now.toISOString();
  return new Date(end) - new Date(entry.timestamp);
}

export default function ActivityFeed() {
  const activity = useLiveQuery(() => getTodaysActivity(), [], []);
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [sortMode, setSortMode] = useState("recent");
  // Ticks the still-checked-in rows' durations forward every second — a
  // frozen "42m" next to someone mid-session would read as broken, not
  // just stale (matches TopBar's live clock for the same reason).
  const now = useClock();

  // Grouped, not just timestamp-ordered — everyone still checked in floats
  // above everyone who's checked out. Within each group, RECENT keeps the
  // domain query's own most-recent-check-in-first order; DURATION sorts by
  // how long the session has run, longest first.
  const active = activity.filter((entry) => !entry.checkOutAt);
  const checkedOutEntries = activity.filter((entry) => entry.checkOutAt);
  if (sortMode === "duration") {
    active.sort((a, b) => durationMs(b, now) - durationMs(a, now));
    checkedOutEntries.sort((a, b) => durationMs(b, now) - durationMs(a, now));
  }
  const orderedActivity = [...active, ...checkedOutEntries];

  async function confirmCheckout() {
    const target = checkoutTarget;
    setCheckoutTarget(null);
    if (target) await checkOutMember(target.id);
  }

  return (
    <View className="flex-1 flex-col gap-2">
      <View className="h-5 flex-row items-center justify-between">
        <Text className="font-heading text-[11px] tracking-[0.1em] text-muted">
          TODAY'S PRESENT
        </Text>
        <Touchable
          onPress={() => setSortMode((mode) => (mode === "recent" ? "duration" : "recent"))}
          accessibilityRole="button"
          accessibilityLabel={sortMode === "duration" ? "Sorted by duration" : "Sorted by most recent"}
          wrapperClassName="shrink-0"
          className="h-5 flex-row items-center gap-1"
        >
          <ArrowUpDown
            size={12}
            strokeWidth={2}
            color={sortMode === "duration" ? colors.accent : colors.textDim}
          />
          <Text
            className="font-heading text-[10px]"
            style={{ color: sortMode === "duration" ? colors.accent : colors.textDim }}
          >
            {sortMode === "duration" ? "DURATION" : "RECENT"}
          </Text>
        </Touchable>
      </View>

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
            {orderedActivity.map((entry, index) => {
              const checkedOut = Boolean(entry.checkOutAt);
              const duration = formatDuration(entry.timestamp, entry.checkOutAt ?? now.toISOString());
              const row = (
                <View
                  style={checkedOut ? undefined : { backgroundColor: colors.accent }}
                  className={`h-[52px] flex-row items-center gap-2.5 px-3.5 ${
                    index < orderedActivity.length - 1 ? "border-b border-hairline" : ""
                  } ${checkedOut ? "opacity-50" : ""}`}
                >
                  <Avatar name={entry.memberName} size={24} />
                  <Text
                    numberOfLines={1}
                    className="flex-1 font-body text-sm"
                    style={{ color: checkedOut ? colors.textPrimary : colors.page }}
                  >
                    {entry.memberName}
                    <Text
                      className="w-12 text-[11px]"
                      style={{ color: checkedOut ? colors.textDim : ACCENT_MUTED }}
                    >
                      {" "}
                      #{entry.memberId}
                    </Text>
                  </Text>
                  <View className="w-[92px] items-end gap-0.5">
                    <Text
                      className="font-body text-[10px]"
                      style={{ color: checkedOut ? colors.textDim : ACCENT_MUTED }}
                    >
                      {formatTime(entry.timestamp)}
                    </Text>
                    <Text
                      className="font-heading text-xs"
                      style={{ color: checkedOut ? colors.textMuted : colors.page }}
                    >
                      {duration}
                    </Text>
                  </View>
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
