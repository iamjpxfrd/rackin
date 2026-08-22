// Membership status derivation — the single source of truth for whether a
// member is active, expired, or expiring soon (frontend-spec.md §5.4).
//
// Status is NEVER stored. It is always derived from the latest payment's
// coversUntil (PRODUCT.md), so a member's status cannot drift out of sync
// with what they actually paid for.

import { EXPIRING_WITHIN_DAYS, PLAN_DAYS } from "./constants.js";

const MS_PER_DAY = 86_400_000;

/** UTC midnight for a date, so day arithmetic ignores clock time. */
function startOfUtcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Whole days between two instants, counted in calendar days rather than
 * elapsed hours — "expires in 1 day" must not flip to 0 just because it's
 * late in the afternoon.
 */
export function daysBetween(fromIso, toIso) {
  return Math.round(
    (startOfUtcDay(new Date(toIso)) - startOfUtcDay(new Date(fromIso))) /
      MS_PER_DAY,
  );
}

/**
 * coversUntil is always paymentDate + planDays — never extended from a
 * prior coversUntil, even on early renewal (PRODUCT.md). The UI shows the
 * resulting date before staff confirm, so the rule is never a surprise.
 *
 * @param {string} paidAtIso
 * @param {"weekly"|"monthly"} planType
 * @returns {string} ISO timestamp
 */
export function computeCoversUntil(paidAtIso, planType) {
  const days = PLAN_DAYS[planType];
  if (!days) {
    throw new Error(`Unknown plan type: ${planType}`);
  }
  return new Date(new Date(paidAtIso).getTime() + days * MS_PER_DAY).toISOString();
}

/**
 * @param {{ coversUntil: string } | null | undefined} latestPayment
 * @param {Date} [now]
 * @returns {{
 *   status: "active"|"expired",
 *   coversUntil: string|null,
 *   daysRemaining: number|null,
 *   isExpiringSoon: boolean,
 * }}
 */
export function deriveStatus(latestPayment, now = new Date()) {
  // A member with no payment has never been covered. Treated as expired
  // rather than as a special third state — staff only need to know whether
  // this person is paid up.
  if (!latestPayment?.coversUntil) {
    return {
      status: "expired",
      coversUntil: null,
      daysRemaining: null,
      isExpiringSoon: false,
    };
  }

  const daysRemaining = daysBetween(now.toISOString(), latestPayment.coversUntil);
  const status = daysRemaining >= 0 ? "active" : "expired";

  return {
    status,
    coversUntil: latestPayment.coversUntil,
    daysRemaining,
    isExpiringSoon:
      status === "active" && daysRemaining <= EXPIRING_WITHIN_DAYS,
  };
}

/**
 * The latest payment for a member — the one status derives from. Compared
 * by paidAt so a backdated entry can't silently win, then by the
 * auto-increment id so two payments sharing a timestamp (a renewal recorded
 * in the same millisecond as registration) resolve to the one written last
 * rather than to whichever the reduce happened to start from.
 */
export function latestPaymentOf(payments) {
  if (!payments?.length) return null;
  return payments.reduce((latest, payment) => {
    if (payment.paidAt !== latest.paidAt) {
      return payment.paidAt > latest.paidAt ? payment : latest;
    }
    return (payment.id ?? 0) > (latest.id ?? 0) ? payment : latest;
  });
}
