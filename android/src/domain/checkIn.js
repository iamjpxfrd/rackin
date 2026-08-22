// Domain layer for check-in (TRD 3.1, 3.2). Numpad, QR, and search all call
// checkInMember with a different `method` — no duplicated lookup/visit-count
// logic per input path (ADR-001).

import { generateClientUuid, store } from "../storage/store.js";
import { enqueue } from "../sync/outbox.js";
import { attributionFor, getOnDesk } from "./staff.js";
import { FORCE_LOGOUT_GRACE_MINUTES, GYM_CLOSING_HOUR, GYM_CLOSING_MINUTE } from "./constants.js";

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

  // Blocked, not just reported, unlike the same-day-but-checked-out case
  // below: a still-open session means this member is, right now, on the
  // premises — a second check-in on top of it isn't a real second visit,
  // it's the same one being entered twice. Checking them out first is the
  // one thing that makes a new check-in meaningful again.
  if (await hasActiveCheckInToday(memberId)) {
    const err = new Error(`${member.name} is already checked in.`);
    err.code = "ALREADY_CHECKED_IN";
    throw err;
  }

  const timestamp = new Date().toISOString();
  const clientUuid = generateClientUuid();

  // Read before writing, or this visit becomes its own "earlier" visit.
  //
  // A member really can train twice in a day — the block above only catches
  // an *open* session, so a legitimate second visit (checked out, then back
  // later) still gets through here. Reported, not blocked, in that case:
  // staff are simply told what they're looking at, which is enough to stop
  // a same-day return from being mistaken for a fresh first-time visit.
  const alreadyCheckedInAt = await lastCheckInToday(memberId);

  // Whoever signed in for this shift, stamped automatically. A check-in is a
  // fast, high-frequency action, so it takes the shift default without asking
  // — unlike a payment, which confirms (domain/staff.js).
  const attribution = attributionFor(await getOnDesk());

  // Check-in row and queue entry commit together, so a visit recorded at the
  // desk can never go missing from the backend (sync/outbox.js).
  await store.transaction(["checkIns", "outbox"], async (tx) => {
    await tx.checkIns.add({ memberId, timestamp, method, clientUuid, ...attribution });
    // timestamp travels with it: a day of offline check-ins pushed at closing
    // time must land at the hours members actually walked in, not all at once
    // (TRD 7).
    await enqueue(tx, "checkin", { memberId, method, clientUuid, timestamp, ...attribution });
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

/** Whether this member has a check-in today that hasn't been checked out of yet. */
async function hasActiveCheckInToday(memberId) {
  const dayStart = startOfLocalDay();
  const openVisits = await store.checkIns
    .where("memberId")
    .equals(memberId)
    .and((checkIn) => checkIn.timestamp >= dayStart && !checkIn.checkOutAt)
    .toArray();
  return openVisits.length > 0;
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
 * Marks a visit as ended (Task 4's activity-list checkout action). Now
 * synced (2026-08-23) via the "checkout" outbox kind, matching every other
 * write in this file — POST /api/checkins/checkout, identified by the
 * check-in's own clientUuid rather than a path param, so it fits the sync
 * layer's flat POST-to-static-path shape instead of needing a dynamic URL.
 * @param {number} checkInId
 */
export async function checkOutMember(checkInId) {
  const checkOutAt = new Date().toISOString();
  await store.transaction(["checkIns", "outbox"], async (tx) => {
    const record = await tx.checkIns.get(checkInId);
    // Already checked out (a double-tap, or the force-logout sweep beat a
    // manual tap to it) or the row is gone — nothing left to record.
    if (!record || record.checkOutAt) return;
    await tx.checkIns.update(checkInId, { checkOutAt });
    await enqueue(tx, "checkout", { checkInClientUuid: record.clientUuid, checkOutAt });
  });
}

/**
 * Force-checks-out anyone still open past the gym's closing time, stamped
 * with the closing time itself rather than whenever this sweep happened to
 * run — a member's recorded duration should read as "until closing," not
 * "until the tablet noticed." A grace period (FORCE_LOGOUT_GRACE_MINUTES)
 * covers the ordinary case of staff wrapping up after doors close.
 *
 * Deliberately swept from a live clock tick (App.js) rather than computed
 * as part of getTodaysActivity() — that's a read, this is a write, and a
 * query function silently mutating rows on every call would be a strange
 * contract to depend on.
 *
 * @param {Date} [now]
 * @returns {Promise<number>} how many were force-checked-out
 */
export async function forceLogoutOverdue(now = new Date()) {
  const closing = new Date(now);
  closing.setHours(GYM_CLOSING_HOUR, GYM_CLOSING_MINUTE, 0, 0);
  const forceLogoutAt = new Date(closing.getTime() + FORCE_LOGOUT_GRACE_MINUTES * 60_000);
  if (now < forceLogoutAt) return 0;

  const dayStart = startOfLocalDay(now);
  const todays = await store.checkIns.where("timestamp").aboveOrEqual(dayStart).toArray();
  const open = todays.filter((entry) => !entry.checkOutAt);
  if (open.length === 0) return 0;

  const checkOutAt = closing.toISOString();
  await store.transaction(["checkIns", "outbox"], async (tx) => {
    for (const entry of open) {
      await tx.checkIns.update(entry.id, { checkOutAt });
      await enqueue(tx, "checkout", { checkInClientUuid: entry.clientUuid, checkOutAt });
    }
  });
  return open.length;
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
 *
 * "Today" is the tablet's own local day, not UTC — same reasoning as
 * lastCheckInToday/hasActiveCheckInToday above. This used to compute the
 * boundary from UTC date parts, which in a timezone ahead of UTC (e.g.
 * UTC+8) doesn't roll over until UTC catches up hours later: local midnight
 * arrives, but the query's "today" doesn't advance until UTC midnight — the
 * list kept showing yesterday's activity for however many hours the local
 * zone leads UTC. Real bug, not a display quirk; fixed by reusing
 * startOfLocalDay() here too.
 * @returns {Promise<Array<{ id: number, memberId: string, timestamp: string, checkOutAt: string|null, method: string, memberName: string }>>}
 */
export async function getTodaysActivity() {
  const dayStart = startOfLocalDay();

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
