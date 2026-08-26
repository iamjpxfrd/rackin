// The Follow Up tab's two questions (frontend-spec.md §6.1, PRD 4.5/4.9).
//
// Previously this derived both lists itself from local Dexie reads (every
// member's latest payment and last visit). That computation now lives on the
// backend, which exposes it directly as /api/checkins/lapsed and
// /api/payments/expiring — so this file's job shrinks to fetching those two
// lists and normalizing whatever they return into the shape the screen
// expects, rather than re-deriving anything locally
// ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted 2026-08-22).

import { getJson } from "../api/client.js";

/**
 * Members whose coverage ends within 7 days, soonest first — from
 * /api/payments/expiring.
 *
 * TODO(dashboard reads): the exact response shape hasn't been confirmed
 * against the live backend yet, so this maps defensively, assuming field
 * names carry over from the pilot's Dexie schema (which matched the backend
 * schema field-for-field). Confirm and tighten this mapping once the
 * dashboard work picks the contract back up — see
 * [[Decisions/Web Becomes a Read-Only Dashboard]].
 */
export async function getExpiringMembers() {
  return normalizeRows(await getJson("/api/payments/expiring"));
}

/**
 * Members with no check-in in 14+ days, longest absence first — from
 * /api/checkins/lapsed. Same shape caveat as getExpiringMembers.
 */
export async function getLapsedMembers() {
  return normalizeRows(await getJson("/api/checkins/lapsed"));
}

/**
 * Both lists in one pass — what the Follow Up screen actually renders.
 * A member can appear in both: they are two different reasons to call, and
 * de-duplicating would hide the more urgent one (frontend-spec.md §6.1).
 */
export async function getFollowUp() {
  const [expiring, lapsed] = await Promise.all([
    getExpiringMembers(),
    getLapsedMembers(),
  ]);
  return { expiring, lapsed };
}

function normalizeRows(data) {
  if (!Array.isArray(data)) return [];
  return data.map((row) => ({
    member: {
      id: row?.member?.id ?? row?.memberId ?? "",
      name: row?.member?.name ?? row?.name ?? "",
      planType: row?.member?.planType ?? row?.planType ?? null,
      phone: row?.member?.phone ?? row?.phone ?? null,
    },
    status: row?.status ?? "expired",
    isExpiringSoon: Boolean(row?.isExpiringSoon),
    daysRemaining: row?.daysRemaining ?? null,
    daysSinceVisit: row?.daysSinceVisit ?? null,
  }));
}
