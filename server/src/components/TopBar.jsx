// Thin top bar per DESIGN.md's layout concept.
//
// The right-hand control is attribution, not a login (domain/staff.js). It
// names who the tablet will credit for the next check-in or payment, and is
// always one tap from being changed — a handover that takes effort to record
// is a handover that stops being recorded.

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { UserRound } from "lucide-react";
import { getOnDesk } from "../domain/staff.js";
import OnDeskSheet from "./staff/OnDeskSheet.jsx";

export default function TopBar() {
  const [pickerOpen, setPickerOpen] = useState(false);
  // undefined until the first read lands, so the bar never flashes "Not set"
  // at someone who is in fact signed in.
  const onDesk = useLiveQuery(() => getOnDesk(), []);

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-steel-300 bg-surface-white px-4">
        <span className="font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-900">
          RackIn
        </span>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="-mr-2 flex h-10 items-center gap-2 rounded-ds-sm px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
        >
          <UserRound size={16} strokeWidth={1.75} className="shrink-0 text-steel-700" />
          {onDesk === undefined ? (
            <span className="font-body text-sm text-steel-700">&nbsp;</span>
          ) : onDesk ? (
            <span className="font-body text-sm text-steel-700">
              On desk:{" "}
              <span className="font-semibold text-ink-900">{onDesk.name}</span>
            </span>
          ) : (
            // Stated plainly rather than nagged about. Nobody signed in is a
            // legitimate state — the front desk still works, records simply
            // carry no name, which is honest (PRD 4.10's spirit).
            <span className="font-body text-sm text-steel-700">Set who's on desk</span>
          )}
        </button>
      </header>

      {pickerOpen && (
        <OnDeskSheet onDesk={onDesk ?? null} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}
