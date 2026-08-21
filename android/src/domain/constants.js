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
 *
 * `session` is a single-day drop-in: someone who pays at the desk, trains
 * once, and leaves. It is a sale, not a membership, which is why it is
 * treated differently on Follow Up (see followUp.js).
 */
export const PLAN_DAYS = { session: 1, weekly: 7, monthly: 30 };

/** Display order — shortest commitment first, matching how staff quote it. */
export const PLAN_TYPES = ["session", "weekly", "monthly"];

const PLAN_LABELS = { session: "Session", weekly: "Weekly", monthly: "Monthly" };

/**
 * One place that turns a stored plan type into words. Every screen calls
 * this rather than testing `=== "weekly"`, so adding a fourth plan can
 * never again leave a screen silently mislabelling it.
 */
export function planLabel(planType) {
  return PLAN_LABELS[planType] ?? planType ?? "—";
}

/** "1 day" / "7 days" / "30 days", for stating duration at the point of choice. */
export function planDuration(planType) {
  const days = PLAN_DAYS[planType];
  if (!days) return "";
  return days === 1 ? "1 day" : `${days} days`;
}

/** A single-day drop-in rather than an ongoing membership. */
export function isDropIn(planType) {
  return planType === "session";
}

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

/**
 * Clock time for visit rows: "9:14 AM".
 *
 * The locale is pinned, like formatDate's, rather than following the device.
 * Left to the device this returned "09:14 AM" on some tablets and "09:14" on
 * others, so a fixed column width was right for one and wrapped the AM/PM onto
 * a second line for the other. A log of times has to be one predictable shape.
 *
 * Hour is `numeric`, not `2-digit`: no leading zero, so the column is right
 * aligned and the colons line up down the list.
 */
export function formatTime(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
