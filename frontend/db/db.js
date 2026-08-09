// Local persistence layer — IndexedDB via Dexie.
// This is the sole source of truth for the pilot (fully offline).
// Schema matches Backend Schema Sections 3-5 field-for-field so a
// future sync layer needs minimal translation.
//
// Every store carries a clientUuid, generated at creation time on
// this device — required later for idempotent sync upserts
// (TRD Section 7), cheap to add now, expensive to retrofit.

import Dexie from "dexie";

export const db = new Dexie("rackin");

db.version(1).stores({
  // id is the sequential member number (string), assigned locally.
  // phone is optional (Decision Record: phone & thresholds).
  members: "id, name, planType, phone, createdAt, clientUuid",

  // Auto-increment local id; memberId links back to members.id.
  payments: "++id, memberId, paidAt, coversUntil, clientUuid",

  // Auto-increment local id; method is one of numpad|qr|search.
  checkIns: "++id, memberId, timestamp, method, clientUuid",
});

/**
 * Generate a client-side UUID for a new record.
 * Falls back gracefully if crypto.randomUUID isn't available
 * (older WebViews on budget tablets).
 */
export function generateClientUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback, sufficient for local idempotency keys
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sequential member id assignment, starting at 1001.
 * Matches the existing frontend scaffold's numbering scheme so ids
 * assigned offline never collide with backend-assigned ids later
 * (both sides use the same deterministic scheme for the pilot's
 * single-device scope).
 */
export async function getNextMemberId() {
  const count = await db.members.count();
  return String(1001 + count);
}

/**
 * Wipe all local data. Dev/testing convenience only — never exposed
 * in the staff-facing UI.
 */
export async function resetDatabase() {
  await db.members.clear();
  await db.payments.clear();
  await db.checkIns.clear();
}
