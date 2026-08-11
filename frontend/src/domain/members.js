// Member registration and profile reads (frontend-spec.md §5.4, PRD 4.6/4.8).

import { db, generateClientUuid, getNextMemberId } from "../../db/db.js";
import { HISTORY_PAGE_SIZE } from "./constants.js";
import { computeCoversUntil, deriveStatus, latestPaymentOf } from "./membership.js";

/**
 * Registers a member and records their first payment in ONE action —
 * never two screens with a save-and-continue step (PRD 4.6 AC3).
 *
 * Both writes share a transaction: a member row with no payment row would
 * be a corrupt record, since status derives from payments and such a member
 * would read as permanently expired.
 *
 * @param {{
 *   name: string, phone?: string|null,
 *   planType: "weekly"|"monthly",
 *   amount: number, paymentMethod: "cash"|"transfer",
 * }} input
 * @returns {Promise<{ member: object, payment: object }>}
 */
export async function registerMember({
  name,
  phone = null,
  planType,
  amount,
  paymentMethod,
}) {
  const trimmedName = String(name ?? "").trim();
  if (!trimmedName) {
    throw new Error("Enter the member's name.");
  }
  if (planType !== "weekly" && planType !== "monthly") {
    throw new Error("Choose a plan.");
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Enter the amount received.");
  }
  if (paymentMethod !== "cash" && paymentMethod !== "transfer") {
    throw new Error("Choose a payment method.");
  }

  const trimmedPhone = String(phone ?? "").trim() || null;

  return db.transaction("rw", db.members, db.payments, async () => {
    const id = await getNextMemberId();
    const createdAt = new Date().toISOString();

    const member = {
      id,
      name: trimmedName,
      planType,
      phone: trimmedPhone,
      createdAt,
      clientUuid: generateClientUuid(),
    };
    await db.members.add(member);

    const payment = {
      memberId: id,
      amount: numericAmount,
      method: paymentMethod,
      paidAt: createdAt,
      coversUntil: computeCoversUntil(createdAt, planType),
      clientUuid: generateClientUuid(),
    };
    const paymentId = await db.payments.add(payment);

    return { member, payment: { ...payment, id: paymentId } };
  });
}

/**
 * Everything the Member Profile screen renders, in one read.
 * @returns {Promise<object|null>}
 */
export async function getMemberProfile(memberId) {
  const member = await db.members.get(memberId);
  if (!member) return null;

  const [payments, checkIns] = await Promise.all([
    db.payments.where("memberId").equals(memberId).toArray(),
    db.checkIns.where("memberId").equals(memberId).toArray(),
  ]);

  payments.sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  checkIns.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const status = deriveStatus(latestPaymentOf(payments));
  const monthStart = startOfUtcMonth(new Date());

  return {
    member,
    ...status,
    // Section headers show the true totals, so a capped list never lies
    // about the count (frontend-spec.md §6.3).
    payments: payments.slice(0, HISTORY_PAGE_SIZE),
    checkIns: checkIns.slice(0, HISTORY_PAGE_SIZE),
    paymentCount: payments.length,
    checkInCount: checkIns.length,
    visitCountThisMonth: checkIns.filter((c) => c.timestamp >= monthStart).length,
  };
}

/**
 * The full roster, name-ascending, each row carrying its derived status.
 * A flat list with no pinned groups — a name is always where the alphabet
 * says it is (frontend-spec.md §6.2).
 *
 * @returns {Promise<Array<{ member: object, status: string, isExpiringSoon: boolean }>>}
 */
export async function listMembers() {
  const [members, payments] = await Promise.all([
    db.members.toArray(),
    db.payments.toArray(),
  ]);

  const paymentsByMember = groupBy(payments, (payment) => payment.memberId);

  return members
    .map((member) => ({
      member,
      ...deriveStatus(latestPaymentOf(paymentsByMember.get(member.id))),
    }))
    .sort((a, b) => a.member.name.localeCompare(b.member.name));
}

/**
 * Roster filter for the Members tab: matches name OR member number, so
 * staff holding a physical card can find someone the same way they would
 * on Check-In. An empty query returns the whole roster — unlike Check-In's
 * findMembersByName, which deliberately returns nothing (frontend-spec.md §6.2).
 */
export function filterMembers(rows, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    ({ member }) =>
      member.name.toLowerCase().includes(needle) || member.id.includes(needle),
  );
}

function startOfUtcMonth(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  ).toISOString();
}

export function groupBy(items, keyOf) {
  const map = new Map();
  for (const item of items) {
    const key = keyOf(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}
