// Membership pricing (added 2026-08-22 — see the Rackin Obsidian vault's
// Decisions index for the full writeup). Session/Weekly/Annually are flat
// prices for everyone; Monthly is the only plan that varies, by two
// independent things: whether this member is a student, and whether the
// gym's current promo is switched on.
//
// The promo is a device-wide setting, not a per-registration choice — it
// stays on (or off) across registrations exactly like "who's on the desk"
// does (staff.js), stored the same way (deviceState), so staff flip it once
// per season rather than every time someone signs up.
//
// This is a deliberate, scoped exception to constants.js's "pilot thresholds
// are NOT staff-configurable" rule (PRODUCT.md) — that rule is about the
// business-logic thresholds (lapsed/expiring windows, plan durations), not
// membership pricing, which the gym has always adjusted seasonally in
// practice. See Decisions/Membership Pricing And The Promo Toggle.md.

import { store } from "../storage/store.js";

const PROMO_ACTIVE_KEY = "monthlyPromoActive";

/** Flat prices for plans with no student/regular split. */
export const FLAT_PRICES = {
  session: 80,
  weekly: 250,
  annually: 1200,
};

/** Monthly's two rate cards — full price, and the discounted price when the promo is on. */
export const MONTHLY_PRICES = {
  full: { regular: 800, student: 700 },
  promo: { regular: 700, student: 500 },
};

/**
 * The suggested amount for a plan, given who's paying and whether the
 * monthly promo is currently on. Session/Weekly/Annually ignore both
 * `isStudent` and `promoActive` — only Monthly varies. Staff can still
 * overwrite whatever this suggests; it's a prefill, not a lock.
 *
 * @returns {number|null} null only for an unrecognized plan type.
 */
export function suggestedAmount(planType, { isStudent = false, promoActive = false } = {}) {
  if (planType === "monthly") {
    const card = promoActive ? MONTHLY_PRICES.promo : MONTHLY_PRICES.full;
    return isStudent ? card.student : card.regular;
  }
  return FLAT_PRICES[planType] ?? null;
}

/** Whether the monthly promo is currently switched on. */
export async function isPromoActive() {
  const stored = await store.deviceState.get(PROMO_ACTIVE_KEY);
  return stored?.value === "1";
}

export async function setPromoActive(active) {
  await store.deviceState.put({ key: PROMO_ACTIVE_KEY, value: active ? "1" : "0" });
}
