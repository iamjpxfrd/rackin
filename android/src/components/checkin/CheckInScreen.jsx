// Ported from server/src/components/checkin/CheckInScreen.jsx, reskinned to
// Kinetic Court. Two real differences from both the web version and the
// first RN port:
//
//  - The "qr" mode has no RN QrScanner yet — that's its own unchecked Task 3
//    item (expo-camera's CameraView + onBarcodeScanned). Selecting it shows
//    an honest placeholder instead of a broken camera, rather than being
//    hidden — numpad and search both already cover check-in with no dead
//    end (PRD 4.2).
//  - Today's Activity sits above the mode-specific content in every mode,
//    not just Numpad. The design session's on-canvas edit moved it above
//    the numpad specifically; a real screen can't have the layout jump
//    depending on which mode is selected, so that placement is applied
//    consistently across Numpad/Search/Scan QR here.

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { checkInMember } from "../../domain/checkIn.js";
import Numpad from "./Numpad.jsx";
import SearchPanel from "./SearchPanel.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import ConfirmationCard from "./ConfirmationCard.jsx";
import ErrorBanner from "./ErrorBanner.jsx";
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
    setError(null);
    try {
      const { member, visitCountThisMonth, alreadyCheckedInAt } = await checkInMember(
        memberId,
        method,
      );
      setConfirmation({ member, visitCountThisMonth, alreadyCheckedInAt });
      setNumpadValue("");
    } catch (err) {
      setError(
        method === "numpad"
          ? `${err.message} — try search by name.`
          : err.message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function selectMode(nextMode) {
    setError(null);
    setMode(nextMode);
  }

  return (
    <ScrollView className="flex-1 bg-page p-4" contentContainerClassName="flex-col gap-3">
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
                  style={{ height: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <Text className="font-body text-xs font-bold tracking-wide text-page">
                    {label}
                  </Text>
                </DiagonalCut>
              ) : (
                <View className="h-11 items-center justify-center border border-border bg-card">
                  <Text className="font-body text-xs font-semibold text-muted">{label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {error && <ErrorBanner message={error} />}

      <ActivityFeed />

      {mode === "numpad" && (
        <Numpad
          value={numpadValue}
          onChange={setNumpadValue}
          onSubmit={(memberId) => handleCheckIn(memberId, "numpad")}
          disabled={submitting}
        />
      )}
      {mode === "search" && (
        <SearchPanel
          onSelect={(memberId) => handleCheckIn(memberId, "search")}
          disabled={submitting}
        />
      )}
      {mode === "qr" && (
        <View className="items-center gap-2 border border-border bg-card p-6">
          <Text className="text-center font-body text-base text-muted">
            Camera scanning isn't wired up on this device yet — use numpad or
            search for now.
          </Text>
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
    </ScrollView>
  );
}
