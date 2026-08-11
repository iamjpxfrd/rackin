// Pilot thresholds and formats, in one place (frontend-spec.md §5.4).
// These are deliberately NOT staff-configurable for the pilot (PRODUCT.md):
// a settings screen would imply a flexibility the product doesn't have.

/** No check-in in this many days ⇒ the member has "stopped coming". */
export const LAPSED_AFTER_DAYS = 14;

/** Coverage ending within this many days ⇒ "expiring soon". */
export const EXPIRING_WITHIN_DAYS = 7;

/**
 * Plan durations in days. Monthly is a flat 30 days, never a calendar
 * month — a deliberate pilot simplification (PRODUCT.md).
 */
export const PLAN_DAYS = { weekly: 7, monthly: 30 };

/**
 * Currency symbol shown beside amounts.
 *
 * frontend-spec.md §11 OD-2: no currency is committed anywhere in the repo
 * and PRODUCT.md forbids inventing pilot specifics, so this ships empty —
 * amounts render as bare numbers. Set it here once and every screen follows;
 * this is the only place it appears.
 */
export const CURRENCY_SYMBOL = "";

/** Cap on rows shown in profile history lists. */
export const HISTORY_PAGE_SIZE = 20;

/** Formats an amount for display, with the currency symbol when one is set. */
export function formatAmount(amount) {
  const value = Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return CURRENCY_SYMBOL ? `${CURRENCY_SYMBOL} ${value}` : value;
}

/**
 * Dates render as "10 Sep 2026" — unambiguous across conventions, unlike
 * numeric formats, and short enough for a list row (frontend-spec.md §7).
 */
export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Short form for history rows: "10 Aug". */
export function formatDayMonth(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

/** Clock time for visit rows: "09:14". */
export function formatTime(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
