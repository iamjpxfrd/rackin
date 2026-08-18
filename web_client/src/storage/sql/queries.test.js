// Proves the SQL in schema.js/queries.js is correct against every call shape
// domain code actually makes (Task 2 Phase 2) — using better-sqlite3 as a
// stand-in SQLite engine so this runs in plain Node, with no Expo project or
// device required. The real adapter swaps this driver for expo-sqlite's;
// nothing here changes when that happens.

import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { applySchema } from "./schema.js";
import { createSqlStore } from "./queries.js";
import { createTestDriver } from "./testDriver.js";

let store;

beforeEach(async () => {
  const db = new Database(":memory:");
  const driver = createTestDriver(db);
  await applySchema(driver);
  store = createSqlStore(driver);
});

describe("members", () => {
  it("adds a keyed record and reads it back", async () => {
    await store.members.add({ id: "1001", name: "Ada", planType: "monthly", createdAt: "t" });
    expect(await store.members.get("1001")).toMatchObject({ id: "1001", name: "Ada" });
  });

  it("counts and lists the whole table", async () => {
    await store.members.add({ id: "1001", name: "Ada" });
    await store.members.add({ id: "1002", name: "Bea" });
    expect(await store.members.count()).toBe(2);
    expect((await store.members.toArray()).map((m) => m.id).sort()).toEqual(["1001", "1002"]);
  });

  it("bulkGet preserves order and leaves misses undefined", async () => {
    await store.members.add({ id: "1001", name: "Ada" });
    const rows = await store.members.bulkGet(["1001", "9999", "1001"]);
    expect(rows.map((row) => row?.id ?? null)).toEqual(["1001", null, "1001"]);
  });
});

describe("payments", () => {
  it("auto-increments id and returns it from add()", async () => {
    await store.members.add({ id: "1001", name: "Ada" });
    const id = await store.payments.add({
      memberId: "1001",
      amount: 500,
      method: "cash",
      paidAt: "2026-08-01T00:00:00.000Z",
      coversUntil: "2026-09-01T00:00:00.000Z",
      clientUuid: "p-1",
    });
    expect(id).toBeGreaterThan(0);
    expect(await store.payments.where("memberId").equals("1001").toArray()).toHaveLength(1);
  });
});

describe("checkIns — the query shapes checkIn.js actually uses", () => {
  beforeEach(async () => {
    await store.members.add({ id: "1001", name: "Ada" });
    await store.checkIns.add({
      memberId: "1001",
      timestamp: "2026-08-18T09:00:00.000Z",
      method: "qr",
      clientUuid: "c-1",
    });
    await store.checkIns.add({
      memberId: "1001",
      timestamp: "2026-08-19T09:00:00.000Z",
      method: "numpad",
      clientUuid: "c-2",
    });
  });

  it("where(memberId).equals().and(predicate) — lastCheckInToday's shape", async () => {
    const todays = await store.checkIns
      .where("memberId")
      .equals("1001")
      .and((row) => row.timestamp >= "2026-08-19T00:00:00.000Z")
      .toArray();
    expect(todays).toHaveLength(1);
    expect(todays[0].clientUuid).toBe("c-2");
  });

  it("where(memberId).equals().and(predicate).count() — countVisitsThisMonth's shape", async () => {
    const count = await store.checkIns
      .where("memberId")
      .equals("1001")
      .and(() => true)
      .count();
    expect(count).toBe(2);
  });

  it("where(timestamp).aboveOrEqual() — getTodaysActivity's shape", async () => {
    const rows = await store.checkIns.where("timestamp").aboveOrEqual("2026-08-19T00:00:00.000Z").toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].clientUuid).toBe("c-2");
  });
});

describe("outbox — the query shapes outbox.js actually uses", () => {
  it("round-trips a JSON body through add()/toArray()", async () => {
    await store.outbox.add({
      kind: "checkin",
      body: { memberId: "1001", nested: { ok: true } },
      clientUuid: "c-1",
      queuedAt: "t",
      attempts: 0,
      status: "pending",
      lastError: null,
    });
    const [row] = await store.outbox.toArray();
    expect(row.body).toEqual({ memberId: "1001", nested: { ok: true } });
  });

  it("where(status).equals() and update() — pendingOperations/markRetryable's shape", async () => {
    const id = await store.outbox.add({
      kind: "checkin",
      body: {},
      clientUuid: "c-1",
      queuedAt: "t",
      attempts: 0,
      status: "pending",
      lastError: null,
    });
    expect(await store.outbox.where("status").equals("pending").count()).toBe(1);

    await store.outbox.update(id, { attempts: 1, lastError: "timeout" });
    const [row] = await store.outbox.where("status").equals("pending").toArray();
    expect(row).toMatchObject({ attempts: 1, lastError: "timeout" });
  });

  it("delete() — markSynced's shape", async () => {
    const id = await store.outbox.add({
      kind: "checkin",
      body: {},
      clientUuid: "c-1",
      queuedAt: "t",
      attempts: 0,
      status: "pending",
      lastError: null,
    });
    await store.outbox.delete(id);
    expect(await store.outbox.count()).toBe(0);
  });

  it("where(id).anyOf().modify() — retryRejected's shape", async () => {
    const a = await store.outbox.add({
      kind: "checkin", body: {}, clientUuid: "a", queuedAt: "t", attempts: 1, status: "rejected", lastError: "409",
    });
    const b = await store.outbox.add({
      kind: "checkin", body: {}, clientUuid: "b", queuedAt: "t", attempts: 1, status: "rejected", lastError: "409",
    });

    await store.outbox.where("id").anyOf([a, b]).modify({ status: "pending", lastError: null });

    expect(await store.outbox.where("status").equals("rejected").count()).toBe(0);
    expect(await store.outbox.where("status").equals("pending").count()).toBe(2);
  });
});

describe("staff and deviceState", () => {
  it("staff add/update matches retireStaff's shape", async () => {
    await store.staff.add({ id: "s-1", name: "Sam", createdAt: "t", retiredAt: null, clientUuid: "u-1" });
    await store.staff.update("s-1", { retiredAt: "2026-08-19T00:00:00.000Z" });
    expect(await store.staff.get("s-1")).toMatchObject({ retiredAt: "2026-08-19T00:00:00.000Z" });
  });

  it("deviceState.put() upserts by key — setOnDesk/clearOnDesk's shape", async () => {
    await store.deviceState.put({ key: "onDeskStaffId", value: "s-1" });
    expect(await store.deviceState.get("onDeskStaffId")).toMatchObject({ value: "s-1" });

    await store.deviceState.put({ key: "onDeskStaffId", value: "s-2" });
    expect(await store.deviceState.get("onDeskStaffId")).toMatchObject({ value: "s-2" });

    await store.deviceState.delete("onDeskStaffId");
    expect(await store.deviceState.get("onDeskStaffId")).toBeUndefined();
  });
});

describe("transaction() — the outbox-in-same-transaction invariant", () => {
  it("commits every table together", async () => {
    await store.members.add({ id: "1001", name: "Ada" });

    await store.transaction(["checkIns", "outbox"], async (tx) => {
      await tx.checkIns.add({ memberId: "1001", timestamp: "t", method: "qr", clientUuid: "c-1" });
      await tx.outbox.add({
        kind: "checkin", body: { memberId: "1001" }, clientUuid: "c-1", queuedAt: "t", attempts: 0,
        status: "pending", lastError: null,
      });
    });

    expect(await store.checkIns.count()).toBe(1);
    expect(await store.outbox.count()).toBe(1);
  });

  it("rolls back every table on failure — a check-in can never exist without its outbox entry", async () => {
    await store.members.add({ id: "1001", name: "Ada" });

    await expect(
      store.transaction(["checkIns", "outbox"], async (tx) => {
        await tx.checkIns.add({ memberId: "1001", timestamp: "t", method: "qr", clientUuid: "c-1" });
        throw new Error("simulated crash before the outbox write");
      }),
    ).rejects.toThrow("simulated crash");

    expect(await store.checkIns.count()).toBe(0);
    expect(await store.outbox.count()).toBe(0);
  });

  it("onCreate fires only after commit, and not at all on rollback", async () => {
    const seen = [];
    const stop = store.outbox.onCreate((record) => seen.push(record.clientUuid));

    await store.transaction(["outbox"], async (tx) => {
      await tx.outbox.add({
        kind: "checkin", body: {}, clientUuid: "committed", queuedAt: "t", attempts: 0,
        status: "pending", lastError: null,
      });
      // Not visible yet — the transaction hasn't committed.
      expect(seen).toEqual([]);
    });
    expect(seen).toEqual(["committed"]);

    await expect(
      store.transaction(["outbox"], async (tx) => {
        await tx.outbox.add({
          kind: "checkin", body: {}, clientUuid: "rolled-back", queuedAt: "t", attempts: 0,
          status: "pending", lastError: null,
        });
        throw new Error("simulated failure");
      }),
    ).rejects.toThrow();
    expect(seen).toEqual(["committed"]);

    stop();
  });
});
