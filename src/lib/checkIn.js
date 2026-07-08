// Domain layer — check-in logic.
// Every input method (numpad, QR scan, name search) calls checkInMember
// so business logic (visit counting, method tracking) lives in one place.
// See docs/architecture/ADR-001 for why this layer exists.

import { db } from "../db/db";

/**
 * Record a check-in for a member.
 * @param {string} memberId
 * @param {'numpad'|'qr'|'search'} method - how staff entered the member
 * @returns {Promise<{member: object, visitCountThisMonth: number}>}
 */
export async function checkInMember(memberId, method) {
  const member = await db.members.get(memberId);
  if (!member) {
    throw new Error(`No member found for #${memberId}`);
  }

  await db.checkIns.add({
    memberId,
    method,
    timestamp: new Date().toISOString(),
  });

  const visitCountThisMonth = await getVisitCountThisMonth(memberId);

  return { member, visitCountThisMonth };
}

async function getVisitCountThisMonth(memberId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return db.checkIns
    .where("memberId")
    .equals(memberId)
    .and((c) => new Date(c.timestamp) >= startOfMonth)
    .count();
}

/**
 * Members with no check-in in the last N days (default 14).
 * The one thing a paper logbook can never surface automatically.
 */
export async function getLapsedMembers(days = 14) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const members = await db.members.toArray();
  const results = [];

  for (const member of members) {
    const lastCheckIn = await db.checkIns
      .where("memberId")
      .equals(member.id)
      .last();

    if (!lastCheckIn || new Date(lastCheckIn.timestamp) < cutoff) {
      results.push({ member, lastCheckIn: lastCheckIn ?? null });
    }
  }

  return results.sort((a, b) => {
    const aDate = a.lastCheckIn ? new Date(a.lastCheckIn.timestamp) : 0;
    const bDate = b.lastCheckIn ? new Date(b.lastCheckIn.timestamp) : 0;
    return aDate - bDate; // oldest first
  });
}
