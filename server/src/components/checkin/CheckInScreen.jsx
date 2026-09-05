import { useEffect, useState } from "react";
import { getTodaysActivity } from "../../domain/checkIn.js";
import { ScreenHeader, Card } from "../ui/Layout.jsx";
import ActivityFeed from "./ActivityFeed.jsx";

// Used to own the numpad/search/QR check-in flow (Numpad.jsx, SearchPanel.jsx,
// QrScanner.jsx, ConfirmationCard.jsx, ErrorBanner.jsx) and the checkInMember
// call behind it. All of that is gone: recording a check-in is android/'s job
// now ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted 2026-08-22).
// What's left is the read-only activity feed, full width per the desktop
// dashboard design canvas.
export default function CheckInScreen() {
  const [rows, setRows] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    getTodaysActivity().then((result) => {
      if (!cancelled) setRows(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activity = rows ?? [];

  return (
    <div className="flex h-full flex-col gap-6">
      <ScreenHeader title="Check-In" meta={rows === undefined ? "" : `${activity.length} today`} />
      <Card className="min-h-0 flex-1 overflow-auto !p-0">
        <ActivityFeed rows={activity} />
      </Card>
    </div>
  );
}
