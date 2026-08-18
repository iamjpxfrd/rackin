import { useState } from "react";
import { checkInMember } from "../../domain/checkIn.js";
import Numpad from "./Numpad.jsx";
import SearchPanel from "./SearchPanel.jsx";
import QrScanner from "./QrScanner.jsx";
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

  function handleCameraUnavailable() {
    // Camera failure never leaves staff stuck — fall back to numpad
    // instantly, no dead end (PRD 4.2 AC2).
    setError("Camera unavailable — try numpad or search.");
    setMode("numpad");
  }

  function selectMode(nextMode) {
    setError(null);
    setMode(nextMode);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden lg:p-6">
      <section className="flex flex-col gap-4 lg:w-[420px] lg:shrink-0">
        <div className="flex gap-2">
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectMode(id)}
              className={`h-10 flex-1 rounded-ds-sm font-body text-sm font-semibold ${
                mode === id
                  ? "bg-ink-900 text-surface-white"
                  : "border border-steel-300 bg-surface-white text-steel-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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
          <QrScanner
            onDecode={(memberId) => handleCheckIn(memberId, "qr")}
            onUnavailable={handleCameraUnavailable}
          />
        )}
      </section>

      <section className="min-h-0 flex-1">
        <ActivityFeed />
      </section>

      {confirmation && (
        <ConfirmationCard
          member={confirmation.member}
          visitCountThisMonth={confirmation.visitCountThisMonth}
          alreadyCheckedInAt={confirmation.alreadyCheckedInAt}
          onDismiss={() => setConfirmation(null)}
        />
      )}
    </div>
  );
}
