import { describe, it, expect } from "vitest";

import { getTodaysActivity } from "./checkIn.js";
import { formatTime } from "./constants.js";

describe("getTodaysActivity", () => {
  it("is stubbed empty until a backend read endpoint exists", async () => {
    // No local storage to read from any more
    // ([[Decisions/Web Becomes a Read-Only Dashboard]]), and no matching
    // backend endpoint yet either — see the TODO in checkIn.js.
    expect(await getTodaysActivity()).toEqual([]);
  });
});

describe("formatTime", () => {
  it("keeps the meridiem on one line with the time", () => {
    // The bug this fixes: a 56px column plus "09:14 AM" dropped the AM onto a
    // second line under the number.
    const rendered = formatTime("2026-08-12T01:14:00.000Z");
    expect(rendered).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  it("drops the leading zero so colons line up in a right-aligned column", () => {
    const morning = new Date("2026-08-12T00:00:00.000Z");
    morning.setHours(9, 14);
    expect(formatTime(morning.toISOString())).toBe("9:14 AM");
  });

  it("renders afternoon times as PM", () => {
    const afternoon = new Date("2026-08-12T00:00:00.000Z");
    afternoon.setHours(14, 37);
    expect(formatTime(afternoon.toISOString())).toBe("2:37 PM");
  });

  it("does not follow the device locale into a 24-hour clock", () => {
    const evening = new Date("2026-08-12T00:00:00.000Z");
    evening.setHours(21, 5);
    // Pinned to en-US: left to the device this returned "21:05" on some
    // tablets and "09:05 PM" on others, so no single column width was right.
    expect(formatTime(evening.toISOString())).toBe("9:05 PM");
  });
});
