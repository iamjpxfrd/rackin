// Ported from server/src/components/checkin/CheckInScreen.jsx. One real gap:
// the "qr" mode has no RN QrScanner yet — that's its own unchecked Task 3
// item (expo-camera's CameraView + onBarcodeScanned). Selecting it shows an
// honest placeholder instead of a broken camera, rather than being hidden —
// numpad and search both already cover check-in with no dead end (PRD 4.2).

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { checkInMember } from "../../domain/checkIn.js";
import Numpad from "./Numpad.jsx";
import SearchPanel from "./SearchPanel.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import ConfirmationCard from "./ConfirmationCard.jsx";
import ErrorBanner from "./ErrorBanner.jsx";

const MODES = [
  { id: "numpad", label: "Numpad" },
  { id: "search", label: "Search by name" },
  { id: "qr", label: "Scan QR" },
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
    <ScrollView className="flex-1 p-4" contentContainerClassName="flex-col gap-4">
      <View className="flex-col gap-4">
        <View className="flex-row gap-2">
          {MODES.map(({ id, label }) => (
            <Pressable
              key={id}
              onPress={() => selectMode(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === id }}
              className={`h-10 flex-1 items-center justify-center rounded-ds-sm ${
                mode === id ? "bg-ink-900" : "border border-steel-300 bg-surface-white"
              }`}
            >
              <Text
                className={`font-body text-sm font-semibold ${
                  mode === id ? "text-surface-white" : "text-steel-700"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && <ErrorBanner message={error} />}

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
          <View className="items-center gap-2 rounded-ds-sm border border-steel-300 bg-chalk-50 p-6">
            <Text className="text-center font-body text-base text-steel-700">
              Camera scanning isn't wired up on this device yet — use numpad or
              search for now.
            </Text>
          </View>
        )}
      </View>

      <View className="min-h-96">
        <ActivityFeed />
      </View>

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
