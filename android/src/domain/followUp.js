// The Follow Up tab's two questions (frontend-spec.md §6.1, PRD 4.5/4.9).
//
// Automatic lapsed and expiring-soon detection is the single thing a paper
// logbook can never do, and the primary reason the system is worth building
// (PRODUCT.md — Positioning). This file is that claim.

import { store } from "../storage/store.js";
import { EXPIRING_WITHIN_DAYS, LAPSED_AFTER_DAYS, isDropIn } from "./constants.js";
import { daysBetween, deriveStatus, latestPaymentOf } from "./membership.js";
import { groupBy } from "./members.js";

/**
 * Reads every member once and attaches their latest payment and last visit.
 * Both list builders share it so a single Follow Up render hits the database
 * one time, not twice per member.
 */
async function loadMemberSnapshots(now) {
  const [members, payments, checkIns] = await Promise.all([
    store.members.toArray(),
    store.payments.toArray(),
    store.checkIns.toArray(),
  ]);

  const paymentsByMember = groupBy(payments, (payment) => payment.memberId);
  const lastVisitByMember = new Map();
  for (const checkIn of checkIns) {
    const current = lastVisitByMember.get(checkIn.memberId);
    if (!current || checkIn.timestamp > current) {
      lastVisitByMember.set(checkIn.memberId, checkIn.timestamp);
    }
  }

  const nowIso = now.toISOString();
  return members.map((member) => {
    const lastVisitAt = lastVisitByMember.get(member.id) ?? null;
    return {
      member,
      lastVisitAt,
      daysSinceVisit: lastVisitAt ? daysBetween(lastVisitAt, nowIso) : null,
      // How long this member has been silent. For someone who has never
      // checked in, silence is measured from the day they registered — a
      // member who signed up an hour ago has not "stopped coming", and
      // putting them on the call list on day one is exactly what would
      // teach the owner to ignore it.
      daysSinceContact: lastVisitAt
        ? daysBetween(lastVisitAt, nowIso)
        : member.createdAt
          ? daysBetween(member.createdAt, nowIso)
          : Infinity,
      ...deriveStatus(latestPaymentOf(paymentsByMember.get(member.id)), now),
    };
  });
}

/** Members who have been silent for 14+ days, longest silence first. */
function selectLapsed(snapshots) {
  return snapshots
    .filter((row) => row.daysSinceContact >= LAPSED_AFTER_DAYS)
    .sort((a, b) => {
      // Never-visited members sort above everyone: someone who signed up
      // and never came is the most lapsed case there is.
      if (a.daysSinceVisit === null && b.daysSinceVisit === null) {
        return b.daysSinceContact - a.daysSinceContact;
      }
      if (a.daysSinceVisit === null) return -1;
      if (b.daysSinceVisit === null) return 1;
      return b.daysSinceVisit - a.daysSinceVisit;
    });
}

/**
 * Members needing a renewal call: coverage ending within 7 days OR already
 * ended, worst-first. Originally "active and ending soon" only — broadened
 * so an already-expired member who's still visiting (so isn't yet on the
 * Stopped Coming list either) doesn't fall through the cracks between the
 * two sections. Ascending sort on daysRemaining already ranks worst-first
 * for free: a member expired 30 days ago (-30) sorts ahead of one expiring
 * tomorrow (1) with no extra logic needed.
 */
function selectExpiring(snapshots) {
  return snapshots
    .filter(
      (row) =>
        row.daysRemaining !== null &&
        row.daysRemaining <= EXPIRING_WITHIN_DAYS &&
        // A one-day drop-in is inside the 7-day window from the moment it is
        // sold, so including sessions would put every day-pass on this list
        // and drown the memberships actually worth a call. Nothing is being
        // saved by phoning someone whose plan was only ever one day.
        !isDropIn(row.member.planType),
    )
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Members with no check-in in 14+ days, longest absence first.
 * Never-visited members carry daysSinceVisit: null and sort as oldest —
 * someone who signed up and never came is the most lapsed case there is.
 *
 * @param {Date} [now]
 */
export async function getLapsedMembers(now = new Date()) {
  return selectLapsed(await loadMemberSnapshots(now));
}

/**
 * Members needing a renewal call — coverage ending within 7 days or already
 * ended, worst-first. Sits above the lapsed list because it's the section
 * most likely to contain a call that still prevents a lapse rather than
 * only recovering one.
 *
 * @param {Date} [now]
 */
export async function getExpiringMembers(now = new Date()) {
  return selectExpiring(await loadMemberSnapshots(now));
}

/**
 * Both lists in one pass — what the Follow Up screen actually renders.
 * A member can appear in both: they are two different reasons to call, and
 * de-duplicating would hide the more urgent one (frontend-spec.md §6.1).
 */
export async function getFollowUp(now = new Date()) {
  const snapshots = await loadMemberSnapshots(now);
  return { expiring: selectExpiring(snapshots), lapsed: selectLapsed(snapshots) };
}
