import { describe, it, expect, beforeEach } from "vitest";
import { db, resetDatabase } from "../../db/db.js";
import { registerMember, getMemberProfile, listMembers, filterMembers } from "./members.js";
import { recordPayment, getLastPaymentAmount } from "./payments.js";

const VALID = {
  name: "Placeholder Name",
  planType: "monthly",
  amount: 500,
  paymentMethod: "cash",
};

beforeEach(async () => {
  await resetDatabase();
});

describe("registerMember", () => {
  it("creates the member and their first payment in one action", async () => {
    const { member, payment } = await registerMember(VALID);

    expect(member.id).toBe("1001");
    expect(await db.members.count()).toBe(1);
    expect(await db.payments.count()).toBe(1);
    expect(payment.memberId).toBe("1001");
    expect(payment.amount).toBe(500);
  });

  it("assigns member numbers sequentially", async () => {
    const first = await registerMember(VALID);
    const second = await registerMember({ ...VALID, name: "Another Name" });
    expect(first.member.id).toBe("1001");
    expect(second.member.id).toBe("1002");
  });

  it("registers as active, covered from the payment date", async () => {
    const { member } = await registerMember(VALID);
    const profile = await getMemberProfile(member.id);
    expect(profile.status).toBe("active");
    expect(profile.daysRemaining).toBe(30);
  });

  it("keeps phone optional and stores it as null when blank", async () => {
    const { member } = await registerMember({ ...VALID, phone: "   " });
    expect(member.phone).toBeNull();
  });

  it("trims the name", async () => {
    const { member } = await registerMember({ ...VALID, name: "  Spaced Name  " });
    expect(member.name).toBe("Spaced Name");
  });

  it("allows two members to share a name — the number disambiguates", async () => {
    await registerMember(VALID);
    await registerMember(VALID);
    const rows = await listMembers();
    expect(rows).toHaveLength(2);
    expect(rows[0].member.id).not.toBe(rows[1].member.id);
  });

  it.each([
    ["a blank name", { name: "   " }, /name/i],
    ["an unknown plan", { planType: "annual" }, /plan/i],
    ["a zero amount", { amount: 0 }, /amount/i],
    ["a non-numeric amount", { amount: "abc" }, /amount/i],
    ["an unknown method", { paymentMethod: "crypto" }, /method/i],
  ])("rejects %s", async (_label, override, message) => {
    await expect(registerMember({ ...VALID, ...override })).rejects.toThrow(message);
  });

  it("writes nothing at all when validation fails", async () => {
    await expect(registerMember({ ...VALID, amount: 0 })).rejects.toThrow();
    expect(await db.members.count()).toBe(0);
    expect(await db.payments.count()).toBe(0);
  });
});

describe("getMemberProfile", () => {
  it("returns null for an unknown member", async () => {
    expect(await getMemberProfile("9999")).toBeNull();
  });

  it("reports true totals even when history is capped", async () => {
    const { member } = await registerMember(VALID);
    for (let i = 0; i < 25; i += 1) {
      await db.checkIns.add({
        memberId: member.id,
        timestamp: new Date(Date.now() - i * 86_400_000).toISOString(),
        method: "numpad",
      });
    }

    const profile = await getMemberProfile(member.id);
    expect(profile.checkInCount).toBe(25);
    expect(profile.checkIns).toHaveLength(20);
  });

  it("orders history newest first", async () => {
    const { member } = await registerMember(VALID);
    await db.checkIns.add({
      memberId: member.id,
      timestamp: "2026-08-01T09:00:00.000Z",
      method: "numpad",
    });
    await db.checkIns.add({
      memberId: member.id,
      timestamp: "2026-08-10T09:00:00.000Z",
      method: "qr",
    });

    const profile = await getMemberProfile(member.id);
    expect(profile.checkIns[0].method).toBe("qr");
  });
});

describe("listMembers", () => {
  it("sorts name-ascending, not by member number", async () => {
    await registerMember({ ...VALID, name: "Zoe Placeholder" });
    await registerMember({ ...VALID, name: "Adam Placeholder" });

    const names = (await listMembers()).map((row) => row.member.name);
    expect(names).toEqual(["Adam Placeholder", "Zoe Placeholder"]);
  });

  it("attaches derived status to every row", async () => {
    await registerMember(VALID);
    const [row] = await listMembers();
    expect(row.status).toBe("active");
    expect(row).toHaveProperty("isExpiringSoon");
  });
});

describe("filterMembers", () => {
  it("matches on partial name, case-insensitively", async () => {
    await registerMember({ ...VALID, name: "Placeholder Name" });
    const rows = await listMembers();
    expect(filterMembers(rows, "placeholder")).toHaveLength(1);
  });

  it("matches on member number, for staff holding a physical card", async () => {
    await registerMember(VALID);
    const rows = await listMembers();
    expect(filterMembers(rows, "1001")).toHaveLength(1);
  });

  it("returns the whole roster for an empty query", async () => {
    await registerMember(VALID);
    const rows = await listMembers();
    expect(filterMembers(rows, "  ")).toHaveLength(1);
  });
});

describe("recordPayment", () => {
  it("moves an expired member back to active", async () => {
    const { member } = await registerMember(VALID);
    // Backdate the original payment so the member reads as expired.
    await db.payments.where("memberId").equals(member.id).modify({
      paidAt: "2026-01-01T00:00:00.000Z",
      coversUntil: "2026-01-31T00:00:00.000Z",
    });
    expect((await getMemberProfile(member.id)).status).toBe("expired");

    const result = await recordPayment({
      memberId: member.id,
      amount: 500,
      method: "cash",
    });

    expect(result.status).toBe("active");
    expect((await getMemberProfile(member.id)).status).toBe("active");
  });

  it("rejects a payment for an unknown member", async () => {
    await expect(
      recordPayment({ memberId: "9999", amount: 500, method: "cash" }),
    ).rejects.toThrow(/No member found/);
  });

  it.each([
    ["a zero amount", { amount: 0 }, /amount/i],
    ["a negative amount", { amount: -5 }, /amount/i],
    ["an unknown method", { method: "crypto" }, /method/i],
  ])("rejects %s", async (_label, override, message) => {
    const { member } = await registerMember(VALID);
    await expect(
      recordPayment({ memberId: member.id, amount: 500, method: "cash", ...override }),
    ).rejects.toThrow(message);
  });
});

describe("getLastPaymentAmount", () => {
  it("returns the most recent amount, for prefilling the payment sheet", async () => {
    const { member } = await registerMember({ ...VALID, amount: 500 });
    await recordPayment({ memberId: member.id, amount: 750, method: "transfer" });
    expect(await getLastPaymentAmount(member.id)).toBe(750);
  });

  it("returns null when the member has never paid", async () => {
    await db.members.add({ id: "2001", name: "Unpaid", planType: "weekly" });
    expect(await getLastPaymentAmount("2001")).toBeNull();
  });
});
