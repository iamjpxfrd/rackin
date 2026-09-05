// Top bar per the desktop dashboard design canvas (WebCheckIn.dc.html etc.).
//
// The "who's on the desk" attribution control used to live here
// (domain/staff.js, components/staff/OnDeskSheet.jsx). Both are gone:
// attribution is recorded at the point of write, which is now android/'s job
// exclusively ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted
// 2026-08-22). In its place: the gym's own name (not the RACKIN wordmark —
// this dashboard is branded to the gym, see domain/constants.js's GYM_NAME),
// the tablet's self-reported sync status (ADR-002 Action Item 8), and the
// MENU control that opens the staggered nav overlay.

import { useEffect, useState } from "react";
import { getSyncStatus } from "../domain/syncStatus.js";
import { GYM_NAME } from "../domain/constants.js";
import SyncStatusIndicator from "./ui/SyncStatusIndicator.jsx";

export default function TopBar({ menuOpen, onToggleMenu }) {
  // No default value: undefined is "not loaded yet", which must never render
  // as "not yet synced" (same rule FollowUpScreen follows for its own fetch).
  const [status, setStatus] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    getSyncStatus()
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => {
        // getJson throws on a non-2xx response or a transport failure. This is
        // exactly the case the indicator exists to warn about, so a silent
        // disappearance here would hide the reading the owner needs most —
        // fall into an explicit error state instead of leaving `status`
        // unset forever.
        if (!cancelled) setStatus({ error: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header
      className="relative z-40 flex h-16 shrink-0 items-center justify-between border-b-2 px-7"
      style={{ background: "var(--color-topbar)", borderColor: "var(--color-topbar-border)" }}
    >
      <div className="flex items-center gap-6">
        <span className="font-heading text-[15px] uppercase tracking-[0.06em] text-text">{GYM_NAME}</span>
        {status && <SyncStatusIndicator status={status} />}
      </div>
      <button type="button" onClick={onToggleMenu} className="flex items-center gap-2.5 bg-transparent">
        <span className="font-heading text-xs tracking-[0.1em] text-text">{menuOpen ? "Close" : "Menu"}</span>
        <span
          className="relative inline-flex h-4 w-4 items-center justify-center"
          style={{
            transform: menuOpen ? "rotate(225deg)" : "rotate(0deg)",
            transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <span className="absolute h-0.5 w-full rounded-full bg-accent" />
          <span className="absolute h-0.5 w-full rounded-full bg-accent" style={{ transform: "rotate(90deg)" }} />
        </span>
      </button>
    </header>
  );
}
