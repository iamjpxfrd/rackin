import { useState } from "react";
import { ScanLine } from "lucide-react";
import { checkInMember } from "../../domain/checkIn.js";
import Numpad from "./Numpad.jsx";
import SearchPanel from "./SearchPanel.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import ConfirmationCard from "./ConfirmationCard.jsx";
import ErrorBanner from "./ErrorBanner.jsx";

// QR scanning is deferred to a later pass (ADR-001's own phased rollout:
// numpad ships first, QR comes online later behind the same checkInMember
// call) — the affordance is visible so its arrival doesn't require a new
// entry point, but it isn't wired to a camera yet.
const QR_ENABLED = false;

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
      const { member, visitCountThisMonth } = await checkInMember(memberId, method);
      setConfirmation({ member, visitCountThisMonth });
      setNumpadValue("");
    } catch (err) {
      setError(
        method === "search"
          ? err.message
          : `${err.message} — try search by name.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden lg:p-6">
      <section className="flex flex-col gap-4 lg:w-[420px] lg:shrink-0">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("numpad")}
            className={`h-10 flex-1 rounded-ds-sm font-body text-sm font-semibold ${
              mode === "numpad"
                ? "bg-ink-900 text-surface-white"
                : "border border-steel-300 bg-surface-white text-steel-700"
            }`}
          >
            Numpad
          </button>
          <button
            type="button"
            onClick={() => setMode("search")}
            className={`h-10 flex-1 rounded-ds-sm font-body text-sm font-semibold ${
              mode === "search"
                ? "bg-ink-900 text-surface-white"
                : "border border-steel-300 bg-surface-white text-steel-700"
            }`}
          >
            Search by name
          </button>
          <button
            type="button"
            disabled={!QR_ENABLED}
            title={QR_ENABLED ? "Scan QR" : "QR check-in is coming soon"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ds-sm border border-steel-300 bg-surface-white text-steel-700 disabled:opacity-40"
          >
            <ScanLine size={20} strokeWidth={1.75} />
          </button>
        </div>

        {error && <ErrorBanner message={error} />}

        {mode === "numpad" ? (
          <Numpad
            value={numpadValue}
            onChange={setNumpadValue}
            onSubmit={(memberId) => handleCheckIn(memberId, "numpad")}
            disabled={submitting}
          />
        ) : (
          <SearchPanel
            onSelect={(memberId) => handleCheckIn(memberId, "search")}
            disabled={submitting}
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
          onDismiss={() => setConfirmation(null)}
        />
      )}
    </div>
  );
}
