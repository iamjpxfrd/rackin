// Domain layer — membership & payment logic.

import { db } from '../db/db';

const PLAN_DURATIONS_DAYS = {
  weekly: 7,
  monthly: 30,
  // Add new plan types here — nothing else needs to change.
};

/**
 * Register a new member and record their first payment in one step.
 */
export async function registerMember({ name, planType, amount, method }) {
  const id = await getNextMemberId();

  await db.members.add({
    id,
    name,
    planType,
    createdAt: new Date().toISOString(),
  });

  await recordPayment(id, { amount, method });

  return id;
}

/**
 * Record a payment for an existing member, extending their plan.
 */
export async function recordPayment(memberId, { amount, method }) {
  const member = await db.members.get(memberId);
  if (!member) throw new Error(`No member found for #${memberId}`);

  const paidAt = new Date();
  const durationDays = PLAN_DURATIONS_DAYS[member.planType];
  const coversUntil = new Date(paidAt);
  coversUntil.setDate(coversUntil.getDate() + durationDays);

  await db.payments.add({
    memberId,
    amount,
    method,
    paidAt: paidAt.toISOString(),
    coversUntil: coversUntil.toISOString(),
  });
}

/**
 * Active / expired status, derived from the most recent payment.
 */
export async function getMembershipStatus(memberId) {
  const lastPayment = await db.payments
    .where('memberId')
    .equals(memberId)
    .last();

  if (!lastPayment) return 'expired';
  return new Date(lastPayment.coversUntil) >= new Date() ? 'active' : 'expired';
}

/**
 * Members whose plan lapses within the next N days (default 7).
 */
export async function getExpiringMembers(days = 7) {
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + days);

  const members = await db.members.toArray();
  const results = [];

  for (const member of members) {
    const lastPayment = await db.payments
      .where('memberId')
      .equals(member.id)
      .last();

    if (!lastPayment) continue;
    const coversUntil = new Date(lastPayment.coversUntil);

    if (coversUntil >= now && coversUntil <= horizon) {
      results.push({ member, coversUntil: lastPayment.coversUntil });
    }
  }

  return results.sort((a, b) => new Date(a.coversUntil) - new Date(b.coversUntil));
}

async function getNextMemberId() {
  const count = await db.members.count();
  return String(1000 + count + 1); // simple sequential numbering, starts at 1001
}
