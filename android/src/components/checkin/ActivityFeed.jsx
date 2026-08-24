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
//
// Checked-out rows are tappable again (Task 6, 2026-08-25) — previously a
// plain non-interactive View. Now opens CheckInAgainModal, a re-check-in
// action rather than the checkout confirmation active rows get.
//
// Re-checking in continues today's running total rather than starting the
// clock at zero (follow-up, same day) — checkInMember (domain/checkIn.js)
// now reopens today's row instead of adding a new one, so there's exactly
// one row per member per day and its own bankedMs column already carries
// the total from any earlier visits. displayDurationMs below just adds
// elapsed time on top while the row is active; a checked-out row's bankedMs
// already is the full total (checkOutMember folds each closing segment in),
// so it needs nothing added.

import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { ArrowUpDown } from "lucide-react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { useClock } from "../../hooks/useClock.js";
import { getTodaysActivity, checkOutMember, checkInMember } from "../../domain/checkIn.js";
import { formatDurationMs, formatTime } from "../../domain/constants.js";
import { Avatar } from "../ui/Avatar.jsx";
import Touchable from "../ui/Touchable.jsx";
import CheckoutModal from "./CheckoutModal.jsx";
import CheckInAgainModal from "./CheckInAgainModal.jsx";
import { showToast } from "../ui/Toast.jsx";
import { colors } from "../../theme/colors.js";

// Placeholder — swap the file, not the reference, once real artwork lands.
const NO_ACTIVITY_IMAGE = require("../../../assets/checkin/no-activity.png");

// Secondary text sitting on the solid accent fill (matches ChoiceGroup.jsx's
// ACCENT_MUTED) — a dark olive rather than pure black, so it reads as
// "muted" without disappearing against lime.
const ACCENT_MUTED = "#3a4a10";

/**
 * The duration shown/sorted for one row — today's running total for this
 * member, not just this row's own timestamp-to-now span. A checked-out
 * row's bankedMs already is that total (checkOutMember folds each closing
 * segment into it), so it needs nothing added. An active row adds its
 * elapsed-so-far on top of whatever was already banked from earlier visits
 * today, which is what makes a re-check-in continue "from where they left
 * off" instead of restarting at zero.
 */
function displayDurationMs(entry, now) {
  const banked = entry.bankedMs ?? 0;
  if (entry.checkOutAt) return banked;
  return banked + (new Date(now) - new Date(entry.timestamp));
}

export default function ActivityFeed({ active: tabActive = true }) {
  const activity = useLiveQuery(() => getTodaysActivity(), [], []);
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [checkInAgainTarget, setCheckInAgainTarget] = useState(null);
  const [sortMode, setSortMode] = useState("recent");

  // Now that App.js keeps every tab mounted (Task 6, hidden via display:
  // none rather than unmounted) instead of destroying the screen on every
  // tab switch, an open confirmation modal would otherwise keep floating
  // over whichever tab staff switch to next — RN's native Modal portals to
  // its own top-level window, so it isn't hidden by a display:none ancestor
  // the way the rest of this screen is (see CheckoutModal.jsx's header for
  // why Modal is used here at all). Closing both on deactivation matches
  // what unmounting used to do for free.
  useEffect(() => {
    if (tabActive) return;
    setCheckoutTarget(null);
    setCheckInAgainTarget(null);
  }, [tabActive]);
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
    active.sort((a, b) => displayDurationMs(b, now) - displayDurationMs(a, now));
    checkedOutEntries.sort((a, b) => displayDurationMs(b, now) - displayDurationMs(a, now));
  }
  const orderedActivity = [...active, ...checkedOutEntries];

  async function confirmCheckout() {
    const target = checkoutTarget;
    setCheckoutTarget(null);
    if (target) await checkOutMember(target.id);
  }

  // Starts a brand new visit through the same checkInMember every other
  // entry path uses, so it picks up the same blocking rules (expired
  // membership, etc.) rather than a special-cased bypass. A rejection
  // surfaces as a toast and the row stays as it was — matches
  // CheckInScreen's own handleCheckIn error handling, not an inline banner,
  // since this is a lightweight confirm rather than a form with values to
  // protect.
  async function confirmCheckInAgain() {
    const target = checkInAgainTarget;
    setCheckInAgainTarget(null);
    if (!target) return;
    try {
      await checkInMember(target.memberId, "numpad");
    } catch (err) {
      showToast(err.message, "warning");
    }
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
              const duration = formatDurationMs(displayDurationMs(entry, now));
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

              return (
                <Pressable
                  key={entry.id}
                  onPress={() =>
                    checkedOut ? setCheckInAgainTarget(entry) : setCheckoutTarget(entry)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    checkedOut ? `Check in ${entry.memberName} again` : `Check out ${entry.memberName}`
                  }
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
      <CheckInAgainModal
        visible={Boolean(checkInAgainTarget)}
        entry={checkInAgainTarget}
        onConfirm={confirmCheckInAgain}
        onCancel={() => setCheckInAgainTarget(null)}
      />
    </View>
  );
}
