// Ported from server/src/components/checkin/CheckInScreen.jsx, reskinned to
// Kinetic Court. One real difference from both the web version and the
// first RN port: Today's Activity's position relative to the mode content
// isn't fixed. For numpad it leads (the design session's on-canvas edit
// moved it above the numpad specifically, so the numpad settles at the
// bottom of the screen — see ActivityFeed.jsx). For search/QR it trails
// instead (`pinBottom`), so the search input / QR viewfinder is reachable
// first rather than pushed down by the activity list.

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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
    } catch (err) {
      // A brief toast, not an inline banner — a bad number/scan is common
      // enough during a busy shift that a lingering banner would just pile
      // up; staff read it and keep going (PRD 4.2: no check-in path
      // dead-ends, but nothing says the message has to persist).
      showToast(
        method === "numpad" ? `${err.message} — try search by name.` : err.message,
        "warning",
      );
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
    <ScrollView className="flex-1 bg-page p-4" contentContainerClassName="flex-grow flex-col gap-3">
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
          the screen) but trails for search/QR (so their input/viewfinder is
          reachable first, with the activity list pinned to the bottom
          below it instead). */}
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
          <ActivityFeed pinBottom />
        </>
      )}
      {mode === "qr" && (
        <>
          <QrScanner
            onDecode={(memberId) => handleCheckIn(memberId, "qr")}
            onUnavailable={handleQrUnavailable}
          />
          <ActivityFeed pinBottom />
        </>
      )}

      {confirmation && (
        <ConfirmationCard
          member={confirmation.member}
          visitCountThisMonth={confirmation.visitCountThisMonth}
          alreadyCheckedInAt={confirmation.alreadyCheckedInAt}
          onDismiss={() => setConfirmation(null)}
        />
      )}
    </ScrollView>
  );
}
