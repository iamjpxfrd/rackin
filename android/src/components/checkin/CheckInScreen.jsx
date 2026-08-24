// Ported from server/src/components/checkin/CheckInScreen.jsx, reskinned to
// Kinetic Court. Today's Present leads on numpad (the design session's
// on-canvas edit moved it above the numpad specifically, so the numpad
// settles at the bottom of the screen — see ActivityFeed.jsx) and trails on
// search (so the search input is reachable first). It's dropped from QR
// entirely: that viewfinder is a full-screen, glance-once mode, and a
// successful scan bounces straight back to numpad (see handleCheckIn)
// rather than lingering here, so there's no room — or need — for the list.
//
// The root is a plain View, not a ScrollView: the numpad needs to float at
// a fixed spot at the bottom of the screen, which only holds if this
// column's total height is capped at the screen (a ScrollView's growable
// content area has no such cap, so a long activity list would stretch the
// whole page and drag the numpad down with it instead of leaving it in
// place). With a bounded column, ActivityFeed's `flex-1` card gets a real,
// fixed pixel height — exactly what's left after the tabs/numpad/search
// content above and below it — the same height the empty state already
// filled. A list that outgrows that height scrolls inside the card's own
// ScrollView (ActivityFeed.jsx); the screen itself never scrolls.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { checkInMember } from "../../domain/checkIn.js";
import Numpad from "./Numpad.jsx";
import SearchPanel from "./SearchPanel.jsx";
import QrScanner from "./QrScanner.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import ConfirmationCard from "./ConfirmationCard.jsx";
import ErrorBanner from "./ErrorBanner.jsx";
import { showToast } from "../ui/Toast.jsx";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import Touchable, { usePressFlash } from "../ui/Touchable.jsx";
import { colors } from "../../theme/colors.js";

const MODES = [
  { id: "numpad", label: "NUMPAD" },
  { id: "search", label: "SEARCH" },
  { id: "qr", label: "SCAN QR" },
];

// Active is a solid accent DiagonalCut fill — Touchable's flash would be
// invisible against a matching color, so that state gets a scale pulse only
// (same reasoning as ChoiceGroup.jsx's selected option). Inactive is a
// plain bordered box, where Touchable's flash reads clearly.
function ModeTab({ id, label, isActive, onPress }) {
  const { trigger, scaleStyle } = usePressFlash();

  if (isActive) {
    return (
      <Pressable
        onPress={() => {
          trigger();
          onPress(id);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        className="flex-1"
      >
        <Animated.View style={scaleStyle}>
          <DiagonalCut
            color={colors.accent}
            cutPercent={90}
            style={{ height: 38, alignItems: "center", justifyContent: "center" }}
          >
            <Text className="font-heading text-xs tracking-wide text-page">{label}</Text>
          </DiagonalCut>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Touchable
      onPress={() => onPress(id)}
      accessibilityState={{ selected: false }}
      wrapperClassName="flex-1"
      className="h-11 items-center justify-center border border-border bg-card"
    >
      <Text className="font-heading text-xs text-muted">{label}</Text>
    </Touchable>
  );
}

export default function CheckInScreen({ active = true }) {
  const [mode, setMode] = useState("numpad");
  const [numpadValue, setNumpadValue] = useState("");
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCheckIn(memberId, method) {
    setSubmitting(true);
    try {
      const { member, visitCountThisMonth, alreadyCheckedInAt } = await checkInMember(
        memberId,
        method,
      );
      setConfirmation({ member, visitCountThisMonth, alreadyCheckedInAt });
      setNumpadValue("");
      // A QR scan is a glance-once action — staff scan and move on, so the
      // screen is already back on the main numpad tab underneath the
      // confirmation card by the time it auto-dismisses.
      if (method === "qr") setMode("numpad");
    } catch (err) {
      // A brief toast, not an inline banner — a bad number/scan is common
      // enough during a busy shift that a lingering banner would just pile
      // up; staff read it and keep going (PRD 4.2: no check-in path
      // dead-ends, but nothing says the message has to persist).
      //
      // The "try search by name" nudge only makes sense for a numpad lookup
      // miss — an already-checked-in rejection, or an expired-membership
      // block, isn't a typo, so each needs its own plain message regardless
      // of which mode triggered it.
      const suggestSearch =
        method === "numpad" && err.code !== "ALREADY_CHECKED_IN" && err.code !== "EXPIRED";
      showToast(suggestSearch ? `${err.message} — try search by name.` : err.message, "warning");
    } finally {
      setSubmitting(false);
    }
  }

  function selectMode(nextMode) {
    setError(null);
    setMode(nextMode);
  }

  function handleQrUnavailable() {
    setMode("numpad");
    setError("Camera scanning isn't available on this device — use numpad or search for now.");
  }

  return (
    <View className="flex-1 flex-col gap-3 bg-page p-4">
      <View className="flex-row gap-1.5">
        {MODES.map(({ id, label }) => (
          <ModeTab key={id} id={id} label={label} isActive={mode === id} onPress={selectMode} />
        ))}
      </View>

      {error && <ErrorBanner message={error} />}

      {/* Activity leads for numpad (so the numpad settles at the bottom of
          the screen) but trails for search (so the input is reachable
          first). QR skips it entirely — see the header comment.
          All three modes stay mounted (display:none instead of unmounting,
          2026-08-25) rather than switching on `mode === ...`: each
          ActivityFeed's useLiveQuery resets to undefined on mount, so
          unmounting/remounting it every tab switch was the empty-state
          flash the user was seeing — same root cause and fix as App.js's
          own tab-mounting, just one level down inside this screen's own
          numpad/search/qr modes. */}
      <View
        style={{ flex: 1, display: mode === "numpad" ? "flex" : "none" }}
        className="flex-col gap-3"
      >
        <ActivityFeed active={active && mode === "numpad"} />
        <Numpad
          value={numpadValue}
          onChange={setNumpadValue}
          onSubmit={(memberId) => handleCheckIn(memberId, "numpad")}
          disabled={submitting}
        />
      </View>
      <View
        style={{ flex: 1, display: mode === "search" ? "flex" : "none" }}
        className="flex-col gap-3"
      >
        <SearchPanel
          onSelect={(memberId) => handleCheckIn(memberId, "search")}
          disabled={submitting}
        />
        <ActivityFeed active={active && mode === "search"} />
      </View>
      {/* QR stays conditionally mounted, not display:none like the two
          modes above — CameraView keeps the camera hardware live even while
          hidden behind display:none (it's not unmounted, just not laid
          out), which would leave the camera running in the background on
          every other tab. That's a real cost (battery, and on some devices
          a visible camera-active light) the empty-state flash isn't worth
          trading for, so QR still pays a re-init ("Starting camera…") on
          every switch back — inherent camera startup, not the same bug as
          ActivityFeed's useLiveQuery reset. */}
      {mode === "qr" && (
        <View style={{ flex: 1 }}>
          <QrScanner
            onDecode={(memberId) => handleCheckIn(memberId, "qr")}
            onUnavailable={handleQrUnavailable}
          />
        </View>
      )}

      {confirmation && (
        <ConfirmationCard
          member={confirmation.member}
          visitCountThisMonth={confirmation.visitCountThisMonth}
          alreadyCheckedInAt={confirmation.alreadyCheckedInAt}
          onDismiss={() => setConfirmation(null)}
        />
      )}
    </View>
  );
}
