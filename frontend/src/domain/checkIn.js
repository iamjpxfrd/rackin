// Domain layer for check-in (TRD 3.1, 3.2). Numpad, QR, and search all call
// checkInMember with a different `method` — no duplicated lookup/visit-count
// logic per input path (ADR-001).

import { generateClientUuid, store } from "../storage/store.js";
import { enqueue } from "../sync/outbox.js";
import { attributionFor, getOnDesk } from "./staff.js";

/**
 * @param {string} memberId
 * @param {"numpad"|"qr"|"search"} method
 * @returns {Promise<{
 *   member: object,
 *   visitCountThisMonth: number,
 *   alreadyCheckedInAt: string|null,
 * }>}
 */
export async function checkInMember(memberId, method) {
  const member = await store.members.get(memberId);
  if (!member) {
    throw new Error(`No member found for #${memberId}`);
  }

  const timestamp = new Date().toISOString();
  const clientUuid = generateClientUuid();

  // Read before writing, or this visit becomes its own "earlier" visit.
  //
  // Reported, never blocked. A member really can train twice in a day, and no
  // check-in path is allowed to dead-end (Product Principle 2) — so the visit
  // is recorded either way and staff are simply told what they are looking at,
  // which is enough to stop an accidental double-tap being mistaken for a
  // second session.
  const alreadyCheckedInAt = await lastCheckInToday(memberId);

  // Whoever signed in for this shift, stamped automatically. A check-in is a
  // fast, high-frequency action, so it takes the shift default without asking
  // — unlike a payment, which confirms (domain/staff.js).
  const attribution = attributionFor(await getOnDesk());

  // Check-in row and queue entry commit together, so a visit recorded at the
  // desk can never go missing from the backend (sync/outbox.js).
  await store.transaction(["checkIns", "outbox"], async () => {
    await store.checkIns.add({ memberId, timestamp, method, clientUuid, ...attribution });
    // timestamp travels with it: a day of offline check-ins pushed at closing
    // time must land at the hours members actually walked in, not all at once
    // (TRD 7).
    await enqueue("checkin", { memberId, method, clientUuid, timestamp, ...attribution });
  });

  const visitCountThisMonth = await countVisitsThisMonth(memberId);
  return { member, visitCountThisMonth, alreadyCheckedInAt };
}

/**
 * The most recent visit already recorded for this member today, or null.
 *
 * "Today" is the tablet's own day, not UTC: the question staff are really
 * asking is whether this person came through the door earlier during this
 * shift, and a gym opening at 6am would otherwise still be on yesterday's
 * date by UTC reckoning.
 */
async function lastCheckInToday(memberId) {
  const dayStart = startOfLocalDay();
  const todaysVisits = await store.checkIns
    .where("memberId")
    .equals(memberId)
    .and((checkIn) => checkIn.timestamp >= dayStart)
    .toArray();

  if (todaysVisits.length === 0) return null;
  return todaysVisits.reduce(
    (latest, checkIn) => (checkIn.timestamp > latest ? checkIn.timestamp : latest),
    todaysVisits[0].timestamp,
  );
}

function startOfLocalDay(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

async function countVisitsThisMonth(memberId) {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  return store.checkIns
    .where("memberId")
    .equals(memberId)
    .and((checkIn) => checkIn.timestamp >= monthStart)
    .count();
}

/**
 * Partial-name filter for the search fallback (PRD 4.3). Never dead-ends:
 * an empty query returns no results rather than the whole member list.
 * @param {string} query
 * @returns {Promise<object[]>}
 */
export async function findMembersByName(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  const members = await store.members.toArray();
  return members
    .filter((member) => member.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20);
}

/**
 * Today's check-ins, most recent first, joined with member name (PRD 4.4).
 * @returns {Promise<Array<{ id: number, memberId: string, timestamp: string, method: string, memberName: string }>>}
 */
export async function getTodaysActivity() {
  const now = new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  const checkIns = await store.checkIns
    .where("timestamp")
    .aboveOrEqual(dayStart)
    .toArray();

  const memberIds = [...new Set(checkIns.map((checkIn) => checkIn.memberId))];
  const members = await store.members.bulkGet(memberIds);
  const nameById = new Map(memberIds.map((id, i) => [id, members[i]?.name]));

  return checkIns
    .map((checkIn) => ({
      ...checkIn,
      memberName: nameById.get(checkIn.memberId) ?? "Unknown member",
    }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
