import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { backfillOutbox, CORE_STORES } from "../../db/db.js";

// Exercises the real version-1 → version-2 upgrade, not a stand-in for it: a
// tablet already in use at the gym carries its whole history in a version-1
// database, and that history only reaches the backend if this path works.

const OUTBOX_STORES = { ...CORE_STORES, outbox: "++id, clientUuid, status" };

let openDatabases = [];

afterEach(async () => {
  for (const database of openDatabases) {
    database.close();
    await Dexie.delete(database.name);
  }
  openDatabases = [];
});

function openLegacy(name) {
  const legacy = new Dexie(name);
  legacy.version(1).stores(CORE_STORES);
  openDatabases.push(legacy);
  return legacy;
}

function reopenUpgraded(name) {
  const upgraded = new Dexie(name);
  upgraded.version(1).stores(CORE_STORES);
  upgraded.version(2).stores(OUTBOX_STORES).upgrade(backfillOutbox);
  openDatabases.push(upgraded);
  return upgraded;
}

async function seedLegacyGym(name) {
  const legacy = openLegacy(name);
  await legacy.members.bulkAdd([
    {
      id: "1001",
      name: "Maria Santos",
      planType: "monthly",
      phone: "09171234567",
      createdAt: "2026-08-01T02:00:00.000Z",
      clientUuid: "member-1001",
    },
    {
      id: "1002",
      name: "Session Walkin",
      planType: "session",
      phone: null,
      createdAt: "2026-08-05T03:00:00.000Z",
      clientUuid: "member-1002",
    },
  ]);
  await legacy.payments.bulkAdd([
    {
      memberId: "1001",
      amount: 1200,
      method: "cash",
      paidAt: "2026-08-01T02:00:00.000Z",
      coversUntil: "2026-08-31T02:00:00.000Z",
      clientUuid: "payment-first-1001",
    },
    {
      memberId: "1001",
      amount: 1200,
      method: "transfer",
      paidAt: "2026-08-31T02:00:00.000Z",
      coversUntil: "2026-09-30T02:00:00.000Z",
      clientUuid: "payment-renewal-1001",
    },
    {
      memberId: "1002",
      amount: 100,
      method: "cash",
      paidAt: "2026-08-05T03:00:00.000Z",
      coversUntil: "2026-08-06T03:00:00.000Z",
      clientUuid: "payment-first-1002",
    },
  ]);
  await legacy.checkIns.add({
    memberId: "1001",
    timestamp: "2026-08-02T01:00:00.000Z",
    method: "numpad",
    clientUuid: "checkin-1001-a",
  });
  legacy.close();
}

describe("backfilling a tablet that predates the outbox", () => {
  it("queues every existing record, registrations first", async () => {
    const name = `rackin-backfill-${crypto.randomUUID()}`;
    await seedLegacyGym(name);

    const upgraded = reopenUpgraded(name);
    const queued = await upgraded.outbox.orderBy("id").toArray();

    expect(queued.map((operation) => operation.kind)).toEqual([
      "register",
      "register",
      "payment",
      "checkin",
    ]);

    // Registrations lead, oldest member first — a payment or check-in that
    // reached the backend first would be refused for an unknown member.
    expect(queued[0].body.memberId).toBe("1001");
    expect(queued[1].body.memberId).toBe("1002");

    // The local rows are untouched: the tablet stays the source of truth and
    // an upgrade must never disturb what staff can already see.
    expect(await upgraded.members.count()).toBe(2);
    expect(await upgraded.payments.count()).toBe(3);
    expect(await upgraded.checkIns.count()).toBe(1);
  });

  it("folds each member's first payment into their registration", async () => {
    const name = `rackin-backfill-${crypto.randomUUID()}`;
    await seedLegacyGym(name);

    const upgraded = reopenUpgraded(name);
    const queued = await upgraded.outbox.orderBy("id").toArray();
    const [maria] = queued;

    // POST /api/members takes the member and their first payment in one call,
    // so queueing that payment separately would record it twice.
    expect(maria.body.amount).toBe(1200);
    expect(maria.body.paymentClientUuid).toBe("payment-first-1001");
    expect(maria.body.phone).toBe("09171234567");
    // The original registration date, not the upgrade's — a member's history
    // must not collapse onto the day the tablet was updated.
    expect(maria.body.createdAt).toBe("2026-08-01T02:00:00.000Z");

    const renewals = queued.filter((operation) => operation.kind === "payment");
    expect(renewals).toHaveLength(1);
    expect(renewals[0].body.clientUuid).toBe("payment-renewal-1001");
    expect(renewals[0].body.paidAt).toBe("2026-08-31T02:00:00.000Z");
  });

  it("carries the session plan the backend used to refuse", async () => {
    const name = `rackin-backfill-${crypto.randomUUID()}`;
    await seedLegacyGym(name);

    const upgraded = reopenUpgraded(name);
    const walkin = await upgraded.outbox.get(2);

    expect(walkin.body.planType).toBe("session");
    expect(walkin.body.clientUuid).toBe("member-1002");
  });

  it("keeps each check-in's original time rather than the upgrade's", async () => {
    const name = `rackin-backfill-${crypto.randomUUID()}`;
    await seedLegacyGym(name);

    const upgraded = reopenUpgraded(name);
    const queued = await upgraded.outbox.orderBy("id").toArray();
    const visit = queued.find((operation) => operation.kind === "checkin");

    // Stamping these with "now" would tell the backend every member visited on
    // upgrade day, which is exactly what the lapsed report reads.
    expect(visit.body.timestamp).toBe("2026-08-02T01:00:00.000Z");
    expect(visit.body.method).toBe("numpad");
  });

  it("runs once, not on every reload", async () => {
    const name = `rackin-backfill-${crypto.randomUUID()}`;
    await seedLegacyGym(name);

    const first = reopenUpgraded(name);
    const afterUpgrade = await first.outbox.count();
    first.close();

    const second = reopenUpgraded(name);
    const afterReopen = await second.outbox.count();

    // Dexie runs an upgrade function only on the version transition. Re-running
    // it would re-queue the gym's entire history on every app start.
    expect(afterUpgrade).toBe(4);
    expect(afterReopen).toBe(4);
  });

  it("does nothing on a tablet that starts fresh", async () => {
    const name = `rackin-backfill-${crypto.randomUUID()}`;
    const empty = openLegacy(name);
    await empty.members.count();
    empty.close();

    const upgraded = reopenUpgraded(name);

    expect(await upgraded.outbox.count()).toBe(0);
  });
});
