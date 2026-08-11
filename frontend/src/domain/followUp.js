// The Follow Up tab's two questions (frontend-spec.md §6.1, PRD 4.5/4.9).
//
// Automatic lapsed and expiring-soon detection is the single thing a paper
// logbook can never do, and the primary reason the system is worth building
// (PRODUCT.md — Positioning). This file is that claim.

import { db } from "../../db/db.js";
import { EXPIRING_WITHIN_DAYS, LAPSED_AFTER_DAYS } from "./constants.js";
import { daysBetween, deriveStatus, latestPaymentOf } from "./membership.js";
import { groupBy } from "./members.js";

/**
 * Reads every member once and attaches their latest payment and last visit.
 * Both list builders share it so a single Follow Up render hits the database
 * one time, not twice per member.
 */
async function loadMemberSnapshots(now) {
  const [members, payments, checkIns] = await Promise.all([
    db.members.toArray(),
    db.payments.toArray(),
    db.checkIns.toArray(),
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
      ...deriveStatus(latestPaymentOf(paymentsByMember.get(member.id)), now),
    };
  });
}

/**
 * Members with no check-in in 14+ days, longest absence first.
 * Never-visited members carry daysSinceVisit: null and sort as oldest —
 * someone who signed up and never came is the most lapsed case there is.
 *
 * @param {Date} [now]
 */
export async function getLapsedMembers(now = new Date()) {
  const snapshots = await loadMemberSnapshots(now);

  return snapshots
    .filter(
      (row) => row.daysSinceVisit === null || row.daysSinceVisit >= LAPSED_AFTER_DAYS,
    )
    .sort((a, b) => {
      if (a.daysSinceVisit === null && b.daysSinceVisit === null) {
        return a.member.name.localeCompare(b.member.name);
      }
      if (a.daysSinceVisit === null) return -1;
      if (b.daysSinceVisit === null) return 1;
      return b.daysSinceVisit - a.daysSinceVisit;
    });
}

/**
 * Members whose coverage ends within 7 days, soonest first. Acting here is
 * the only case where a phone call prevents a lapse rather than recovering
 * one, which is why this list sits above the lapsed one.
 *
 * @param {Date} [now]
 */
export async function getExpiringMembers(now = new Date()) {
  const snapshots = await loadMemberSnapshots(now);

  return snapshots
    .filter(
      (row) =>
        row.status === "active" &&
        row.daysRemaining !== null &&
        row.daysRemaining <= EXPIRING_WITHIN_DAYS,
    )
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Both lists in one pass — what the Follow Up screen actually renders.
 * A member can appear in both: they are two different reasons to call, and
 * de-duplicating would hide the more urgent one (frontend-spec.md §6.1).
 */
export async function getFollowUp(now = new Date()) {
  const snapshots = await loadMemberSnapshots(now);

  const expiring = snapshots
    .filter(
      (row) =>
        row.status === "active" &&
        row.daysRemaining !== null &&
        row.daysRemaining <= EXPIRING_WITHIN_DAYS,
    )
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const lapsed = snapshots
    .filter(
      (row) => row.daysSinceVisit === null || row.daysSinceVisit >= LAPSED_AFTER_DAYS,
    )
    .sort((a, b) => {
      if (a.daysSinceVisit === null && b.daysSinceVisit === null) {
        return a.member.name.localeCompare(b.member.name);
      }
      if (a.daysSinceVisit === null) return -1;
      if (b.daysSinceVisit === null) return 1;
      return b.daysSinceVisit - a.daysSinceVisit;
    });

  return { expiring, lapsed };
}
