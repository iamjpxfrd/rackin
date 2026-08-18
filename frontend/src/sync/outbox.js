// The queue of local writes waiting to reach the backend (TRD 7).
//
// The tablet is the source of truth (ADR-001). Nothing here is allowed to fail
// a local flow: staff must be able to register, check in, and take payment with
// no network at all, so enqueuing is a side effect of a write that already
// succeeded, never a precondition for one.

// requeueEverything() below is the one deliberate exception to this module
// otherwise using the storage interface: rebuilding the outbox from Dexie's
// own version-1 backfill needs a raw Dexie transaction handle
// (tx.table(name)), which is inherently tied to Dexie's migration mechanism
// and not something a storage-agnostic interface can express.
import { backfillOutbox, db } from "../../db/db.js";
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
 * Call this INSIDE the caller's existing Dexie transaction, passing db.outbox
 * as one of its tables. A queue entry written in a separate transaction can be
 * lost to a crash between the two, which would drop the record from the backend
 * permanently and silently — the tablet would still show it, so nobody would
 * ever notice it was missing.
 *
 * @param {"register"|"payment"|"checkin"} kind
 * @param {object} body exact JSON payload to POST
 */
export function enqueue(kind, body) {
  endpointFor(kind);
  return store.outbox.add({
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
export function requeueEverything() {
  return db.transaction("rw", db.members, db.payments, db.checkIns, db.outbox, async (tx) => {
    // Cleared first so a rejected or half-drained queue cannot leave stale
    // entries alongside the rebuilt ones.
    await tx.table("outbox").clear();
    await backfillOutbox(tx);
    return tx.table("outbox").count();
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
