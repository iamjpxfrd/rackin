import { beforeEach, describe, expect, it } from "vitest";

import { db, resetDatabase } from "../../db/db.js";
import { checkInMember } from "./checkIn.js";
import { registerMember } from "./members.js";
import { recordPayment } from "./payments.js";
import {
  addStaff,
  clearOnDesk,
  getOnDesk,
  listStaff,
  retireStaff,
  setOnDesk,
} from "./staff.js";

beforeEach(async () => {
  await resetDatabase();
});

async function signIn(name) {
  const person = await addStaff(name);
  await setOnDesk(person.id);
  return person;
}

function registerDefaultMember(overrides = {}) {
  return registerMember({
    name: "Maria Santos",
    planType: "monthly",
    amount: 1200,
    paymentMethod: "cash",
    ...overrides,
  });
}

describe("the staff list", () => {
  it("starts empty — the gym supplies its own names", async () => {
    // PRODUCT.md forbids inventing pilot specifics, so nothing is seeded.
    expect(await listStaff()).toEqual([]);
    expect(await getOnDesk()).toBeNull();
  });

  it("refuses a duplicate name", async () => {
    await addStaff("Ana Reyes");

    // Unlike members, where a number disambiguates two Marias, two Anas in an
    // attribution field disambiguate nothing — and knowing which is the point.
    await expect(addStaff("ana reyes")).rejects.toThrow("already on the staff list");
  });

  it("refuses a blank name", async () => {
    await expect(addStaff("   ")).rejects.toThrow("Enter the staff member's name.");
  });

  it("hides someone who has left without erasing them", async () => {
    const ana = await addStaff("Ana Reyes");
    await addStaff("Ben Cruz");

    await retireStaff(ana.id);

    expect((await listStaff()).map((person) => person.name)).toEqual(["Ben Cruz"]);
    // Never deleted: she still took payments last month, and those records
    // have to keep naming somebody.
    expect(await db.staff.get(ana.id)).toBeTruthy();
  });

  it("stops crediting someone who is retired mid-shift", async () => {
    const ana = await signIn("Ana Reyes");

    await retireStaff(ana.id);

    expect(await getOnDesk()).toBeNull();
  });
});

describe("attribution on records", () => {
  it("stamps a check-in with whoever is on the desk", async () => {
    const ana = await signIn("Ana Reyes");
    const { member } = await registerDefaultMember();

    await checkInMember(member.id, "numpad");

    const visit = await db.checkIns.where("memberId").equals(member.id).first();
    expect(visit.recordedById).toBe(ana.id);
    expect(visit.recordedByName).toBe("Ana Reyes");
  });

  it("stamps a renewal with whoever is on the desk by default", async () => {
    const ana = await signIn("Ana Reyes");
    const { member } = await registerDefaultMember();

    const { payment } = await recordPayment({
      memberId: member.id,
      amount: 1200,
      method: "cash",
    });

    expect(payment.recordedById).toBe(ana.id);
  });

  it("credits the person the payment sheet actually names, not the shift", async () => {
    await signIn("Ana Reyes");
    const ben = await addStaff("Ben Cruz");
    const { member } = await registerDefaultMember();

    const { payment } = await recordPayment({
      memberId: member.id,
      amount: 1200,
      method: "cash",
      recordedBy: ben,
    });

    // The handover nobody remembered to record, caught at the money.
    expect(payment.recordedByName).toBe("Ben Cruz");
  });

  it("attributes the registration payment too", async () => {
    const ana = await signIn("Ana Reyes");

    const { payment } = await registerDefaultMember();

    // Registering takes money; the screen it came through does not change that.
    expect(payment.recordedById).toBe(ana.id);
    expect(payment.recordedByName).toBe("Ana Reyes");
  });

  it("falls back to the shift when the caller has not decided yet", async () => {
    const ana = await signIn("Ana Reyes");
    const { member } = await registerDefaultMember();

    // What a payment sheet submitted before its shift lookup resolved looks
    // like. Treating that as "deliberately nobody" silently dropped the name
    // off real payments while somebody was in fact on the desk.
    const { payment } = await recordPayment({
      memberId: member.id,
      amount: 1200,
      method: "cash",
      recordedBy: undefined,
    });

    expect(payment.recordedById).toBe(ana.id);
  });

  it("distinguishes 'nobody is signed in' from 'not decided yet'", async () => {
    const ana = await signIn("Ana Reyes");
    const { member } = await registerDefaultMember();

    const explicit = await recordPayment({
      memberId: member.id,
      amount: 100,
      method: "cash",
      recordedBy: null,
    });

    // An explicit null overrides the shift: staff said this one was not them.
    expect(explicit.payment.recordedById).toBeNull();
    expect(await getOnDesk()).toEqual(expect.objectContaining({ id: ana.id }));
  });

  it("records an unattributed payment rather than refusing it", async () => {
    await clearOnDesk();
    const { member } = await registerDefaultMember();

    const { payment } = await recordPayment({
      memberId: member.id,
      amount: 1200,
      method: "cash",
      recordedBy: null,
    });

    // Nobody signed in is a truthful record. Blocking the payment would mean
    // the app declines to record money the gym has already taken.
    expect(payment.recordedById).toBeNull();
    expect(payment.recordedByName).toBeNull();
  });

  it("keeps the name a record was written with when the roster changes later", async () => {
    const ana = await signIn("Ana Reyes");
    const { member, payment } = await registerDefaultMember();
    await checkInMember(member.id, "numpad");

    await retireStaff(ana.id);

    const stored = await db.payments.get(payment.id);
    // Denormalised on purpose: history must not be rewritten by a later edit
    // to the staff list.
    expect(stored.recordedByName).toBe("Ana Reyes");
  });
});

describe("what gets pushed to the backend", () => {
  it("carries attribution on every queued operation", async () => {
    const ana = await signIn("Ana Reyes");
    const { member } = await registerDefaultMember();
    await checkInMember(member.id, "numpad");
    await recordPayment({ memberId: member.id, amount: 1200, method: "cash" });

    const queued = await db.outbox.orderBy("id").toArray();

    expect(queued.map((operation) => operation.kind)).toEqual([
      "register",
      "checkin",
      "payment",
    ]);
    for (const operation of queued) {
      expect(operation.body.recordedById).toBe(ana.id);
      expect(operation.body.recordedByName).toBe("Ana Reyes");
    }
  });

  it("re-sends who was responsible at the time, not today's shift", async () => {
    const ana = await signIn("Ana Reyes");
    const { member } = await registerDefaultMember();
    await checkInMember(member.id, "numpad");
    await db.outbox.clear();

    // A different shift rebuilds the queue days later.
    const ben = await addStaff("Ben Cruz");
    await setOnDesk(ben.id);
    const { requeueEverything } = await import("../sync/outbox.js");
    await requeueEverything();

    const queued = await db.outbox.orderBy("id").toArray();
    for (const operation of queued) {
      expect(operation.body.recordedByName).toBe("Ana Reyes");
      expect(operation.body.recordedById).toBe(ana.id);
    }
    expect(ben.id).not.toBe(ana.id);
  });
});
