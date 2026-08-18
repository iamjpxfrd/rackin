import { beforeEach, describe, expect, it } from "vitest";

import { resetDatabase } from "../../db/db.js";
import { checkInMember } from "./checkIn.js";
import { formatTime } from "./constants.js";
import { registerMember } from "./members.js";

beforeEach(async () => {
  await resetDatabase();
});

function registerDefaultMember(overrides = {}) {
  return registerMember({
    name: "Maria Santos",
    planType: "monthly",
    amount: 1200,
    paymentMethod: "cash",
    ...overrides,
  });
}

describe("repeat check-ins on the same day", () => {
  it("reports no earlier visit the first time a member comes in", async () => {
    const { member } = await registerDefaultMember();

    const result = await checkInMember(member.id, "numpad");

    expect(result.alreadyCheckedInAt).toBeNull();
    expect(result.visitCountThisMonth).toBe(1);
  });

  it("reports the earlier visit on a repeat, and still records the new one", async () => {
    const { member } = await registerDefaultMember();
    const first = await checkInMember(member.id, "numpad");
    expect(first.alreadyCheckedInAt).toBeNull();

    const second = await checkInMember(member.id, "numpad");

    // Reported, not blocked: a member can genuinely train twice in a day, and
    // no check-in path may dead-end (Product Principle 2).
    expect(second.alreadyCheckedInAt).not.toBeNull();
    expect(second.visitCountThisMonth).toBe(2);
  });

  it("names the time of the earlier visit, not this one", async () => {
    const { member } = await registerDefaultMember();
    const first = await checkInMember(member.id, "numpad");
    const firstVisit = await recordedVisits(member.id);

    const second = await checkInMember(member.id, "qr");

    // Reading after the write would make this visit its own "earlier" visit,
    // so every check-in would claim the member had already been in.
    expect(second.alreadyCheckedInAt).toBe(firstVisit[0].timestamp);
    expect(first.alreadyCheckedInAt).toBeNull();
  });

  it("does not confuse one member's visit for another's", async () => {
    const { member: maria } = await registerDefaultMember();
    const { member: john } = await registerDefaultMember({ name: "John Doe" });
    await checkInMember(maria.id, "numpad");

    const johnsFirst = await checkInMember(john.id, "numpad");

    expect(johnsFirst.alreadyCheckedInAt).toBeNull();
  });

  it("treats a visit from a previous day as not today", async () => {
    const { member } = await registerDefaultMember();
    const { db } = await import("../../db/db.js");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await db.checkIns.add({
      memberId: member.id,
      timestamp: yesterday.toISOString(),
      method: "numpad",
      clientUuid: "yesterdays-visit",
    });

    const today = await checkInMember(member.id, "numpad");

    // Yesterday's attendance is not a double tap.
    expect(today.alreadyCheckedInAt).toBeNull();
  });
});

async function recordedVisits(memberId) {
  const { db } = await import("../../db/db.js");
  const visits = await db.checkIns.where("memberId").equals(memberId).toArray();
  return visits.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

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
