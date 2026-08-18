import { describe, it, expect } from "vitest";
import {
  computeCoversUntil,
  daysBetween,
  deriveStatus,
  latestPaymentOf,
} from "./membership.js";

const DAY = 86_400_000;
const NOW = new Date("2026-08-11T10:00:00.000Z");

function daysFromNow(days) {
  return new Date(NOW.getTime() + days * DAY).toISOString();
}

describe("computeCoversUntil", () => {
  it("adds 7 days for a weekly plan", () => {
    const covers = computeCoversUntil("2026-08-11T00:00:00.000Z", "weekly");
    expect(covers).toBe("2026-08-18T00:00:00.000Z");
  });

  it("adds a flat 30 days for monthly, not a calendar month", () => {
    // February would be 28 days as a calendar month; the pilot uses 30.
    const covers = computeCoversUntil("2026-02-01T00:00:00.000Z", "monthly");
    expect(covers).toBe("2026-03-03T00:00:00.000Z");
  });

  it("rejects an unknown plan rather than silently covering zero days", () => {
    expect(() => computeCoversUntil(NOW.toISOString(), "annual")).toThrow(
      /Unknown plan type/,
    );
  });

  it("always counts from the payment date, even on early renewal", () => {
    // Renewing 20 days into a 30-day plan SHORTENS coverage. This is a
    // deliberate pilot simplification (PRODUCT.md), asserted so nobody
    // "fixes" it into extend-from-coversUntil without a decision.
    const paidAt = daysFromNow(0);
    expect(computeCoversUntil(paidAt, "monthly")).toBe(daysFromNow(30));
  });
});

describe("deriveStatus", () => {
  it("treats a member with no payment as expired", () => {
    expect(deriveStatus(null, NOW)).toEqual({
      status: "expired",
      coversUntil: null,
      daysRemaining: null,
      isExpiringSoon: false,
    });
  });

  it("is active while coverage remains", () => {
    const result = deriveStatus({ coversUntil: daysFromNow(20) }, NOW);
    expect(result.status).toBe("active");
    expect(result.daysRemaining).toBe(20);
    expect(result.isExpiringSoon).toBe(false);
  });

  it("is expiring soon at exactly the 7-day threshold", () => {
    const result = deriveStatus({ coversUntil: daysFromNow(7) }, NOW);
    expect(result.status).toBe("active");
    expect(result.isExpiringSoon).toBe(true);
  });

  it("is not expiring soon at 8 days", () => {
    expect(deriveStatus({ coversUntil: daysFromNow(8) }, NOW).isExpiringSoon).toBe(
      false,
    );
  });

  it("counts coverage ending today as still active", () => {
    const endOfToday = "2026-08-11T23:59:00.000Z";
    const result = deriveStatus({ coversUntil: endOfToday }, NOW);
    expect(result.status).toBe("active");
    expect(result.daysRemaining).toBe(0);
  });

  it("is expired once coverage has passed, with a negative day count", () => {
    const result = deriveStatus({ coversUntil: daysFromNow(-3) }, NOW);
    expect(result.status).toBe("expired");
    expect(result.daysRemaining).toBe(-3);
    expect(result.isExpiringSoon).toBe(false);
  });

  it("counts calendar days, not elapsed hours", () => {
    // Late in the day, "tomorrow" must still read as 1 day — not 0 because
    // fewer than 24 hours remain.
    const lateEvening = new Date("2026-08-11T23:00:00.000Z");
    const tomorrowMorning = "2026-08-12T06:00:00.000Z";
    expect(deriveStatus({ coversUntil: tomorrowMorning }, lateEvening).daysRemaining).toBe(1);
  });
});

describe("latestPaymentOf", () => {
  it("returns null when there are no payments", () => {
    expect(latestPaymentOf([])).toBeNull();
    expect(latestPaymentOf(undefined)).toBeNull();
  });

  it("picks the latest by paidAt, not by insertion order", () => {
    const payments = [
      { id: 1, paidAt: "2026-08-01T00:00:00.000Z" },
      { id: 2, paidAt: "2026-06-01T00:00:00.000Z" },
    ];
    expect(latestPaymentOf(payments).id).toBe(1);
  });
});

describe("daysBetween", () => {
  it("is symmetric in sign", () => {
    expect(daysBetween("2026-08-01T00:00:00.000Z", "2026-08-11T00:00:00.000Z")).toBe(10);
    expect(daysBetween("2026-08-11T00:00:00.000Z", "2026-08-01T00:00:00.000Z")).toBe(-10);
  });
});
