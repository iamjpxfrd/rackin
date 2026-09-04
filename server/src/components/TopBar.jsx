// Thin top bar per DESIGN.md's layout concept.
//
// The "who's on the desk" attribution control used to live here
// (domain/staff.js, components/staff/OnDeskSheet.jsx). Both are gone:
// attribution is recorded at the point of write, which is now android/'s job
// exclusively ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted
// 2026-08-22). In its place: the tablet's self-reported sync status
// (ADR-002 Action Item 8) — this bar is the one spot mounted across every
// tab and the profile detail view, so it's where a reading that must always
// be visible belongs.

import { useEffect, useState } from "react";
import { getSyncStatus } from "../domain/syncStatus.js";
import SyncStatusIndicator from "./ui/SyncStatusIndicator.jsx";

export default function TopBar() {
  // No default value: undefined is "not loaded yet", which must never render
  // as "not yet synced" (same rule FollowUpScreen follows for its own fetch).
  const [status, setStatus] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    getSyncStatus().then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-steel-300 bg-surface-white px-4">
      <span className="font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-900">
        RackIn
      </span>
      {status && <SyncStatusIndicator status={status} />}
    </header>
  );
}
