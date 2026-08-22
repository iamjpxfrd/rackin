// The queue of local writes waiting to reach the backend (TRD 7). Ported
// from server/src/sync/outbox.js.
//
// The tablet is the source of truth (ADR-001). Nothing here is allowed to fail
// a local flow: staff must be able to register, check in, and take payment with
// no network at all, so enqueuing is a side effect of a write that already
// succeeded, never a precondition for one.
//
// The one real logic difference from the server version: requeueEverything()
// no longer reaches into a raw Dexie transaction to run a schema-upgrade
// backfill (server/db/db.js's backfillOutbox, used both as a Dexie
// .upgrade() hook and for manual resync). RN has no pre-outbox install to
// migrate from — there's only the manual-resync use case — so that same
// record-to-operation algorithm is reimplemented here directly against the
// RN store's own table shape (tx.members, not tx.table("members")).
//
// Everything else below is byte-identical to server/src/sync/outbox.js:
// `store` from android/src/storage/store.js awaits the db open internally
// (see that file's header), so every `await store.outbox...` call here reads
// exactly like Dexie's always-ready version.

import { store } from "../storage/store.js";

/** A queued operation the backend has not accepted yet. */
export const PENDING = "pending";

/**
 * Refused by the backend for a reason retrying cannot fix — a 4xx. Kept rather
 * than deleted so the failure is still debuggable later (TRD 8), and skipped by
 * the drain so one bad record can never wedge the queue behind it.
 */
export const REJECTED = "rejected";

const ENDPOINTS = {
  register: "/api/members",
  payment: "/api/payments",
  checkin: "/api/checkins",
  // Body-based, not a path param (POST /api/checkins/checkout with
  // checkInClientUuid in the body) — the sync layer only knows how to POST
  // to a static path per kind, so identifying the check-in has to travel in
  // the body rather than a dynamic URL segment.
  checkout: "/api/checkins/checkout",
  // No backend endpoint exists yet — the whole app is still offline-only
  // (Task 4's "Integrate" item). Queuing this kind now means a Store sale or
  // expense recorded before backend integration lands still gets pushed once
  // it does, same as every other domain's history.
  store: "/api/store",
};

export function endpointFor(kind) {
  const endpoint = ENDPOINTS[kind];
  if (!endpoint) {
    throw new Error(`Unknown sync operation: ${kind}`);
  }
  return endpoint;
}

/**
 * Queue one operation for the next sync.
 *
 * Call this with the `tx` from the caller's own store.transaction([..., "outbox"], ...)
 * call. A queue entry written outside that transaction can be lost to a crash
 * between the two, which would drop the record from the backend permanently
 * and silently — the tablet would still show it, so nobody would ever notice
 * it was missing.
 *
 * @param {{ outbox: object }} tx
 * @param {"register"|"payment"|"checkin"|"checkout"|"store"} kind
 * @param {object} body exact JSON payload to POST
 */
export function enqueue(tx, kind, body) {
  endpointFor(kind);
  return tx.outbox.add({
    kind,
    body,
    // Mirrors body.clientUuid: the same key the backend dedupes on, lifted out
    // so a queued operation can be found without deserializing every body.
    clientUuid: body.clientUuid ?? null,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    status: PENDING,
    lastError: null,
  });
}

/**
 * Everything still waiting, oldest first.
 *
 * Insertion order is a correctness requirement, not a nicety: a payment or
 * check-in that reaches the backend before the registration it references is
 * refused, because that member does not exist there yet.
 */
export async function pendingOperations() {
  const queued = await store.outbox.where("status").equals(PENDING).toArray();
  return queued.sort((a, b) => a.id - b.id);
}

/** How many writes have yet to reach the backend. */
export function pendingCount() {
  return store.outbox.where("status").equals(PENDING).count();
}

/** Accepted by the backend — the local record is now mirrored there. */
export function markSynced(id) {
  return store.outbox.delete(id);
}

/** Failed in a way a later retry could fix. Stays queued. */
export function markRetryable(operation, message) {
  return store.outbox.update(operation.id, {
    attempts: (operation.attempts ?? 0) + 1,
    lastError: message,
  });
}

/** Refused permanently. Stays in the table, skipped by every future drain. */
export function markRejected(operation, message) {
  return store.outbox.update(operation.id, {
    attempts: (operation.attempts ?? 0) + 1,
    status: REJECTED,
    lastError: message,
  });
}

/** Everything the backend refused, oldest first, for inspecting a stuck sync. */
export async function rejectedOperations() {
  const refused = await store.outbox.where("status").equals(REJECTED).toArray();
  return refused.sort((a, b) => a.id - b.id);
}

// attributionOf isn't reproduced here: this schema has never shipped without
// recordedById/recordedByName, unlike the web version's pre-version-3 records.
function attributionOf(record) {
  return {
    recordedById: record?.recordedById ?? null,
    recordedByName: record?.recordedByName ?? null,
  };
}

/**
 * Same record-to-operation algorithm as server/db/db.js's backfillOutbox,
 * against the RN store's transaction shape instead of a raw Dexie tx.
 */
async function rebuildOutboxFrom(tx) {
  const members = await tx.members.toArray();
  if (members.length === 0) return;

  const payments = await tx.payments.toArray();
  const checkIns = await tx.checkIns.toArray();

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
    tx.outbox.add({
      kind,
      body,
      clientUuid: body.clientUuid ?? null,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      status: PENDING,
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
 * Rebuild the queue from every local record, discarding whatever it held.
 *
 * For when the backend's copy has diverged and the tablet's version is the one
 * to trust — which it always is (ADR-001). Safe to run repeatedly: the backend
 * dedupes on clientUuid, so anything already there is accepted as a no-op and
 * only the genuinely missing records are written.
 *
 * Deliberately manual. This re-sends the gym's entire history, which is the
 * right answer after a divergence and the wrong one on any kind of schedule.
 *
 * @returns {Promise<number>} how many operations are now queued
 */
export async function requeueEverything() {
  return store.transaction(["members", "payments", "checkIns", "outbox"], async (tx) => {
    // Cleared first so a rejected or half-drained queue cannot leave stale
    // entries alongside the rebuilt ones.
    await tx.outbox.clear();
    await rebuildOutboxFrom(tx);
    return tx.outbox.count();
  });
}

/**
 * Put refused operations back in the queue.
 *
 * A rejection is permanent with respect to *retrying*, not with respect to the
 * world: a `409` because the member number was taken stops being true once the
 * conflicting member is removed. Nothing calls this automatically — that would
 * be an infinite loop dressed up as a retry — so it exists for the moment
 * someone has fixed the underlying cause and wants the record pushed.
 *
 * @returns {Promise<number>} how many were re-queued
 */
export async function retryRejected() {
  const refused = await rejectedOperations();
  if (refused.length === 0) return 0;

  await store.outbox
    .where("id")
    .anyOf(refused.map((operation) => operation.id))
    .modify({ status: PENDING, lastError: null });

  return refused.length;
}
