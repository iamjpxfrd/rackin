import { Hash, ScanLine, Search } from "lucide-react";
import { formatTime } from "../../domain/constants.js";

const METHOD_ICON = { numpad: Hash, qr: ScanLine, search: Search };
const METHOD_LABEL = { numpad: "Numpad", qr: "QR", search: "Search" };

// Presentational table, per the desktop dashboard design canvas's Check-In
// screen — full width, no sidebar. CheckInScreen owns the fetch.
export default function ActivityFeed({ rows }) {
  if (rows.length === 0) {
    // Centered in the full card, not pinned to the top — CheckInScreen's
    // card fills the screen's remaining height, and a top-anchored message
    // would leave most of that height reading as an unstyled dead panel.
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-body text-sm text-text-muted">No check-ins yet today.</p>
      </div>
    );
  }

  return (
    <table className="w-full border-collapse font-body text-sm">
      <thead>
        <tr>
          {["Time", "Member", "Method", "State"].map((h, i) => (
            <th
              key={h}
              className={`border-b border-border bg-page px-5 pb-2.5 pt-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-text-muted ${
                i === 3 ? "text-right" : "text-left"
              }`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((entry) => {
          const MethodIcon = METHOD_ICON[entry.method] ?? Hash;
          const checkedOut = Boolean(entry.checkedOutAt);
          return (
            <tr key={entry.id} className="h-14 border-b border-hairline last:border-b-0">
              <td className="px-5 text-text-muted">{formatTime(entry.timestamp)}</td>
              <td className="px-5 font-medium text-text">{entry.memberName}</td>
              <td className="px-5">
                <span className="inline-flex items-center gap-1.5 text-text-muted">
                  <MethodIcon size={16} strokeWidth={1.75} aria-hidden="true" />
                  {METHOD_LABEL[entry.method] ?? entry.method}
                </span>
              </td>
              <td
                className={`px-5 text-right font-heading text-xs font-bold ${
                  checkedOut ? "text-text-muted" : "text-accent"
                }`}
              >
                {checkedOut ? "Checked Out" : "Checked In"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
