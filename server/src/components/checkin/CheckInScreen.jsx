import ActivityFeed from "./ActivityFeed.jsx";

// Used to own the numpad/search/QR check-in flow (Numpad.jsx, SearchPanel.jsx,
// QrScanner.jsx, ConfirmationCard.jsx, ErrorBanner.jsx) and the checkInMember
// call behind it. All of that is gone: recording a check-in is android/'s job
// now ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted 2026-08-22).
// What's left is the read-only activity feed.
export default function CheckInScreen() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:p-6">
      <ActivityFeed />
    </div>
  );
}
