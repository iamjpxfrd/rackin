import { describe, it, expect, beforeEach } from "vitest";
import { db, resetDatabase } from "../../db/db.js";
import { getFollowUp, getLapsedMembers, getExpiringMembers } from "./followUp.js";

const DAY = 86_400_000;
const NOW = new Date("2026-08-11T10:00:00.000Z");

function iso(daysFromNow) {
  return new Date(NOW.getTime() + daysFromNow * DAY).toISOString();
}

/** Seeds one member with an optional last visit and coverage end. */
async function seed({
  id,
  name,
  lastVisitDaysAgo = null,
  coversInDays = null,
  registeredDaysAgo = 400,
}) {
  await db.members.add({
    id,
    name,
    planType: "monthly",
    phone: null,
    createdAt: iso(-registeredDaysAgo),
  });
  if (coversInDays !== null) {
    await db.payments.add({
      memberId: id,
      amount: 500,
      method: "cash",
      paidAt: iso(coversInDays - 30),
      coversUntil: iso(coversInDays),
    });
  }
  if (lastVisitDaysAgo !== null) {
    await db.checkIns.add({
      memberId: id,
      timestamp: iso(-lastVisitDaysAgo),
      method: "numpad",
    });
  }
}

beforeEach(async () => {
  await resetDatabase();
});

describe("getLapsedMembers", () => {
  it("includes members at exactly the 14-day threshold", async () => {
    await seed({ id: "1001", name: "Exactly Fourteen", lastVisitDaysAgo: 14 });
    const lapsed = await getLapsedMembers(NOW);
    expect(lapsed.map((r) => r.member.id)).toEqual(["1001"]);
  });

  it("excludes a member who visited 13 days ago", async () => {
    await seed({ id: "1001", name: "Recent", lastVisitDaysAgo: 13 });
    expect(await getLapsedMembers(NOW)).toHaveLength(0);
  });

  it("sorts longest absence first", async () => {
    await seed({ id: "1001", name: "Twenty", lastVisitDaysAgo: 20 });
    await seed({ id: "1002", name: "Thirty", lastVisitDaysAgo: 30 });
    await seed({ id: "1003", name: "Fifteen", lastVisitDaysAgo: 15 });

    const ids = (await getLapsedMembers(NOW)).map((r) => r.member.id);
    expect(ids).toEqual(["1002", "1001", "1003"]);
  });

  it("sorts never-visited members above everyone, as the oldest case", async () => {
    await seed({ id: "1001", name: "Ninety", lastVisitDaysAgo: 90 });
    await seed({ id: "1002", name: "Never Visited", lastVisitDaysAgo: null });

    const rows = await getLapsedMembers(NOW);
    expect(rows[0].member.id).toBe("1002");
    expect(rows[0].daysSinceVisit).toBeNull();
  });

  it("does not flag a member who registered today and hasn't visited yet", async () => {
    // Registration is not an absence. Listing someone an hour after signup
    // is what teaches the owner to ignore the list.
    await seed({ id: "1001", name: "Just Joined", registeredDaysAgo: 0 });
    expect(await getLapsedMembers(NOW)).toHaveLength(0);
  });

  it("flags a never-visited member once 14 days have passed since registration", async () => {
    await seed({ id: "1001", name: "Signed Up Then Vanished", registeredDaysAgo: 14 });
    const rows = await getLapsedMembers(NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0].daysSinceVisit).toBeNull();
  });

  it("still waits out the threshold for a member who registered 13 days ago", async () => {
    await seed({ id: "1001", name: "Almost", registeredDaysAgo: 13 });
    expect(await getLapsedMembers(NOW)).toHaveLength(0);
  });

  it("orders never-visited members by how long ago they registered", async () => {
    await seed({ id: "1001", name: "Recent Signup", registeredDaysAgo: 20 });
    await seed({ id: "1002", name: "Old Signup", registeredDaysAgo: 60 });

    const ids = (await getLapsedMembers(NOW)).map((r) => r.member.id);
    expect(ids).toEqual(["1002", "1001"]);
  });

  it("uses the most recent visit, not the oldest", async () => {
    await seed({ id: "1001", name: "Returner", lastVisitDaysAgo: 40 });
    await db.checkIns.add({
      memberId: "1001",
      timestamp: iso(-2),
      method: "qr",
    });
    expect(await getLapsedMembers(NOW)).toHaveLength(0);
  });
});

describe("getExpiringMembers", () => {
  it("includes coverage ending in exactly 7 days", async () => {
    await seed({ id: "1001", name: "Seven", lastVisitDaysAgo: 1, coversInDays: 7 });
    expect(await getExpiringMembers(NOW)).toHaveLength(1);
  });

  it("excludes coverage ending in 8 days", async () => {
    await seed({ id: "1001", name: "Eight", lastVisitDaysAgo: 1, coversInDays: 8 });
    expect(await getExpiringMembers(NOW)).toHaveLength(0);
  });

  it("excludes already-expired members — they are not saveable by a call", async () => {
    await seed({ id: "1001", name: "Gone", lastVisitDaysAgo: 1, coversInDays: -2 });
    expect(await getExpiringMembers(NOW)).toHaveLength(0);
  });

  it("excludes members who have never paid", async () => {
    await seed({ id: "1001", name: "Unpaid", lastVisitDaysAgo: 1, coversInDays: null });
    expect(await getExpiringMembers(NOW)).toHaveLength(0);
  });

  it("sorts soonest first", async () => {
    await seed({ id: "1001", name: "Five", lastVisitDaysAgo: 1, coversInDays: 5 });
    await seed({ id: "1002", name: "Two", lastVisitDaysAgo: 1, coversInDays: 2 });
    await seed({ id: "1003", name: "Six", lastVisitDaysAgo: 1, coversInDays: 6 });

    const ids = (await getExpiringMembers(NOW)).map((r) => r.member.id);
    expect(ids).toEqual(["1002", "1001", "1003"]);
  });
});

describe("getFollowUp", () => {
  it("lists a member in BOTH sections when they qualify for both", async () => {
    // Paid up but stopped coming, and coverage about to end: two different
    // reasons to call, so hiding either would lose information.
    await seed({ id: "1001", name: "Both", lastVisitDaysAgo: 30, coversInDays: 3 });

    const { expiring, lapsed } = await getFollowUp(NOW);
    expect(expiring.map((r) => r.member.id)).toEqual(["1001"]);
    expect(lapsed.map((r) => r.member.id)).toEqual(["1001"]);
  });

  it("keeps a paid-up member who stopped coming visible as Active", async () => {
    await seed({ id: "1001", name: "Paid But Absent", lastVisitDaysAgo: 23, coversInDays: 20 });
    const { lapsed } = await getFollowUp(NOW);
    expect(lapsed[0].status).toBe("active");
    expect(lapsed[0].daysSinceVisit).toBe(23);
  });

  it("returns empty lists when nobody needs a call", async () => {
    await seed({ id: "1001", name: "Fine", lastVisitDaysAgo: 1, coversInDays: 25 });
    const { expiring, lapsed } = await getFollowUp(NOW);
    expect(expiring).toHaveLength(0);
    expect(lapsed).toHaveLength(0);
  });

  it("returns empty lists when there are no members at all", async () => {
    const { expiring, lapsed } = await getFollowUp(NOW);
    expect(expiring).toEqual([]);
    expect(lapsed).toEqual([]);
  });
});
