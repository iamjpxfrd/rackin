// The tablet's self-reported outbox depth/age (ADR-002 Action Item 8), read
// from /api/sync/status — so the dashboard can tell a caught-up tablet from
// one that has gone quiet, rather than confidently showing figures that are
// quietly incomplete ([[Decisions/Web Becomes a Read-Only Dashboard]]).

import { getJson } from "../api/client.js";

/**
 * @returns {Promise<{pendingCount: number, oldestPendingAt: string|null, reportedAt: string|null}>}
 * `reportedAt` is null when the tablet has never reported at all — distinct
 * from a report whose queue happened to be empty.
 */
export async function getSyncStatus() {
  return normalize(await getJson("/api/sync/status"));
}

function normalize(data) {
  return {
    pendingCount: data?.pendingCount ?? 0,
    oldestPendingAt: data?.oldestPendingAt ?? null,
    reportedAt: data?.reportedAt ?? null,
  };
}
