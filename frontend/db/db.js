// Local persistence layer — IndexedDB via Dexie.
// This is the sole source of truth for the pilot (fully offline).
// Schema matches Backend Schema Sections 3-5 field-for-field so a
// future sync layer needs minimal translation.
//
// Every store carries a clientUuid, generated at creation time on
// this device — required later for idempotent sync upserts
// (TRD Section 7), cheap to add now, expensive to retrofit.

import Dexie from "dexie";

export const db = new Dexie("rackin");

// Exported so a test can build an equivalent version-1 database, seed it, and
// exercise the real upgrade path. A backfill that has never actually run
// against version-1 data is not one anybody should trust a gym's history to.
export const CORE_STORES = {
  // id is the sequential member number (string), assigned locally.
  // phone is optional (Decision Record: phone & thresholds).
  members: "id, name, planType, phone, createdAt, clientUuid",

  // Auto-increment local id; memberId links back to members.id.
  payments: "++id, memberId, paidAt, coversUntil, clientUuid",

  // Auto-increment local id; method is one of numpad|qr|search.
  checkIns: "++id, memberId, timestamp, method, clientUuid",
};

db.version(1).stores(CORE_STORES);

// Version 2 adds the sync outbox (TRD 7). Purely additive — an existing tablet
// upgrades in place and keeps every local record, since the source of truth is
// still IndexedDB and the outbox only describes what has yet to be pushed.
db.version(2).stores({
  ...CORE_STORES,

  // The queue of local writes not yet accepted by the backend.
  //
  // ++id is the ordering guarantee, not just a key: registrations must reach
  // the backend before the payments and check-ins that reference them, or the
  // member does not exist yet and the write is refused. Draining in insertion
  // order preserves the order the front desk actually did things in.
  //
  // clientUuid is indexed so a record can be found without scanning, and is
  // unique per queued operation — it is the same key the backend dedupes on.
  outbox: "++id, clientUuid, status",
}).upgrade(backfillOutbox);

// Version 3 adds staff attribution: who was on the desk when a visit was
// logged or money changed hands.
//
// Additive again, and deliberately not backfilled. Records written before this
// version carry no `recordedBy`, which is the truthful answer — the tablet did
// not know at the time and guessing now would invent an accountable party for
// a payment nobody can actually vouch for.
db.version(3).stores({
  ...CORE_STORES,
  outbox: "++id, clientUuid, status",

  // The gym's own staff. Names come from the gym (PRODUCT.md forbids inventing
  // pilot specifics). `retiredAt` rather than deletion: someone who has left
  // still took payments last month, and their name has to keep resolving.
  staff: "id, name, retiredAt, clientUuid",

  // Device-local UI state that must survive a reload — currently only who is
  // on the desk. Kept in Dexie rather than localStorage so useLiveQuery reacts
  // to a shift change without a bespoke event listener.
  deviceState: "key",
});

/**
 * Queue everything this tablet recorded before the outbox existed.
 *
 * Without this, a tablet already in use at the gym would sync only what it did
 * from the upgrade onwards, and its entire history to date would sit on the
 * device looking perfectly healthy while never reaching the backend — the worst
 * kind of data loss, because nothing anywhere reports it.
 *
 * Dexie runs an upgrade function exactly once per device, on the transition
 * from version 1 to version 2. That is the idempotency guarantee: this cannot
 * double-queue on a later reload, and a tablet that starts fresh at version 2
 * never runs it at all, because it has no version 1 data to migrate.
 */
// Attribution as stored on a record, or nulls for anything written before
// version 3. Read from the record rather than from whoever is on the desk now:
// a rebuild of the queue must re-send who was actually responsible at the time,
// not credit today's shift with last month's payments.
function attributionOf(record) {
  return {
    recordedById: record?.recordedById ?? null,
    recordedByName: record?.recordedByName ?? null,
  };
}

export async function backfillOutbox(tx) {
  const members = await tx.table("members").toArray();
  if (members.length === 0) return;

  const payments = await tx.table("payments").toArray();
  const checkIns = await tx.table("checkIns").toArray();
  const outbox = tx.table("outbox");

  const paymentsByMember = new Map();
  for (const payment of payments) {
    const bucket = paymentsByMember.get(payment.memberId);
    if (bucket) bucket.push(payment);
    else paymentsByMember.set(payment.memberId, [payment]);
  }
  for (const bucket of paymentsByMember.values()) {
    bucket.sort((a, b) => String(a.paidAt).localeCompare(String(b.paidAt)));
  }

  const queue = (kind, body) =>
    outbox.add({
      kind,
      body,
      clientUuid: body.clientUuid ?? null,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      status: "pending",
      lastError: null,
    });

  // Registrations first, oldest member first. Everything below references a
  // member, and the backend refuses a payment or check-in for someone it has
  // never heard of.
  const registered = new Set();
  const oldestFirst = [...members].sort((a, b) =>
    String(a.createdAt).localeCompare(String(b.createdAt)),
  );

  for (const member of oldestFirst) {
    // A member's first payment is part of registering them, exactly as
    // POST /api/members expects — not a separate operation.
    const first = paymentsByMember.get(member.id)?.[0];
    if (!first) {
      // Registration writes the member and their first payment in one
      // transaction, so this cannot happen. If it somehow has, the backend
      // would reject the registration for a missing amount; leaving the member
      // local-only is the more honest outcome than queueing a certain failure.
      continue;
    }
    await queue("register", {
      memberId: member.id,
      name: member.name,
      planType: member.planType,
      phone: member.phone ?? null,
      amount: first.amount,
      method: first.method,
      clientUuid: member.clientUuid,
      paymentClientUuid: first.clientUuid,
      createdAt: member.createdAt,
      // Null on anything written before version 3, which is the truthful
      // answer rather than an absence to be filled in.
      ...attributionOf(first),
    });
    registered.add(member.id);
  }

  // Renewals: every payment except the one already carried by its registration.
  const renewals = [];
  for (const [memberId, bucket] of paymentsByMember) {
    if (!registered.has(memberId)) continue;
    renewals.push(...bucket.slice(1));
  }
  renewals.sort((a, b) => String(a.paidAt).localeCompare(String(b.paidAt)));

  for (const payment of renewals) {
    await queue("payment", {
      memberId: payment.memberId,
      amount: payment.amount,
      method: payment.method,
      clientUuid: payment.clientUuid,
      paidAt: payment.paidAt,
      ...attributionOf(payment),
    });
  }

  const visits = checkIns
    .filter((checkIn) => registered.has(checkIn.memberId))
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

  for (const checkIn of visits) {
    await queue("checkin", {
      memberId: checkIn.memberId,
      method: checkIn.method,
      clientUuid: checkIn.clientUuid,
      timestamp: checkIn.timestamp,
      ...attributionOf(checkIn),
    });
  }
}

/**
 * Generate a client-side UUID for a new record.
 * Falls back gracefully if crypto.randomUUID isn't available
 * (older WebViews on budget tablets).
 */
export function generateClientUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback, sufficient for local idempotency keys
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sequential member id assignment, starting at 1001.
 * Matches the existing frontend scaffold's numbering scheme so ids
 * assigned offline never collide with backend-assigned ids later
 * (both sides use the same deterministic scheme for the pilot's
 * single-device scope).
 */
export async function getNextMemberId() {
  const count = await db.members.count();
  return String(1001 + count);
}

/**
 * Wipe all local data. Dev/testing convenience only — never exposed
 * in the staff-facing UI.
 */
export async function resetDatabase() {
  await db.members.clear();
  await db.payments.clear();
  await db.checkIns.clear();
  await db.outbox.clear();
  await db.staff.clear();
  await db.deviceState.clear();
}
