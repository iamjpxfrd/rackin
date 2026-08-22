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
import { checkInMember } from "../../domain/checkIn.js";
import Numpad from "./Numpad.jsx";
import SearchPanel from "./SearchPanel.jsx";
import QrScanner from "./QrScanner.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import ConfirmationCard from "./ConfirmationCard.jsx";
import ErrorBanner from "./ErrorBanner.jsx";
import { showToast } from "../ui/Toast.jsx";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import { colors } from "../../theme/colors.js";

const MODES = [
  { id: "numpad", label: "NUMPAD" },
  { id: "search", label: "SEARCH" },
  { id: "qr", label: "SCAN QR" },
];

export default function CheckInScreen() {
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
      // miss — an already-checked-in rejection isn't a typo, so it needs
      // its own plain message regardless of which mode triggered it.
      const suggestSearch = method === "numpad" && err.code !== "ALREADY_CHECKED_IN";
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
        {MODES.map(({ id, label }) => {
          const isActive = mode === id;
          return (
            <Pressable
              key={id}
              onPress={() => selectMode(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className="flex-1"
            >
              {isActive ? (
                <DiagonalCut
                  color={colors.accent}
                  cutPercent={90}
                  style={{ height: 38, alignItems: "center", justifyContent: "center" }}
                >
                  <Text className="font-heading text-xs tracking-wide text-page">
                    {label}
                  </Text>
                </DiagonalCut>
              ) : (
                <View className="h-11 items-center justify-center border border-border bg-card">
                  <Text className="font-heading text-xs text-muted">{label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {error && <ErrorBanner message={error} />}

      {/* Activity leads for numpad (so the numpad settles at the bottom of
          the screen) but trails for search (so the input is reachable
          first). QR skips it entirely — see the header comment. */}
      {mode === "numpad" && (
        <>
          <ActivityFeed />
          <Numpad
            value={numpadValue}
            onChange={setNumpadValue}
            onSubmit={(memberId) => handleCheckIn(memberId, "numpad")}
            disabled={submitting}
          />
        </>
      )}
      {mode === "search" && (
        <>
          <SearchPanel
            onSelect={(memberId) => handleCheckIn(memberId, "search")}
            disabled={submitting}
          />
          <ActivityFeed />
        </>
      )}
      {mode === "qr" && (
        <QrScanner
          onDecode={(memberId) => handleCheckIn(memberId, "qr")}
          onUnavailable={handleQrUnavailable}
        />
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
