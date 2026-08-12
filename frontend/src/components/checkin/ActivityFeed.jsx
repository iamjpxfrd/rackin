import { useLiveQuery } from "dexie-react-hooks";
import { Hash, ScanLine, Search } from "lucide-react";
import { getTodaysActivity } from "../../domain/checkIn.js";
// Imported rather than redefined: this file used to carry its own copy, and two
// copies of a format are two places for it to drift.
import { formatTime } from "../../domain/constants.js";

const METHOD_ICON = { numpad: Hash, qr: ScanLine, search: Search };

// The live-updating equivalent of the old logbook page (PRD 4.4) — re-runs
// automatically on every local write via Dexie's liveQuery, no manual
// refresh, no network dependency.
export default function ActivityFeed() {
  const activity = useLiveQuery(() => getTodaysActivity(), [], []);

  return (
    <div className="flex h-full flex-col">
      <div className="px-1 pb-3">
        <span className="font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-steel-700">
          Today's Activity
        </span>
      </div>

      <div className="flex-1 overflow-y-auto rounded-ds-sm border border-steel-300 bg-surface-white">
        {activity.length === 0 ? (
          <p className="p-6 text-center font-body text-base text-steel-700">
            No check-ins yet today.
          </p>
        ) : (
          <ul>
            {activity.map((entry) => {
              const MethodIcon = METHOD_ICON[entry.method] ?? Hash;
              return (
                <li
                  key={entry.id}
                  className="flex h-14 items-center gap-3 border-b border-steel-300 px-4 last:border-b-0"
                >
                  {/* Wide enough for "10:02 AM" and nowrap so the meridiem can
                      never drop under the number; right aligned so the colons
                      line up down the column. */}
                  <span className="w-20 shrink-0 whitespace-nowrap text-right font-mono text-sm text-steel-700">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className="w-14 shrink-0 font-mono text-sm text-steel-700">
                    #{entry.memberId}
                  </span>
                  <span className="flex-1 truncate font-body text-base text-ink-900">
                    {entry.memberName}
                  </span>
                  <MethodIcon
                    size={18}
                    strokeWidth={1.75}
                    className="shrink-0 text-steel-700"
                    aria-label={entry.method}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
