// One-way push, tablet → backend (TRD 7).
//
// The tablet stays authoritative and the backend never pushes changes back:
// with one device in the pilot (ADR-001) there is nothing to reconcile, and a
// two-way sync would introduce conflict resolution the product does not need.
//
// Every failure here is silent. Sync is additive — no local flow depends on it,
// so surfacing a sync error to staff would report a problem they cannot act on
// and did not cause (PRD 4.10).

import { db, resetDatabase } from "../../db/db.js";
import { isSyncConfigured, postJson, SyncRejectedError } from "./api.js";
import {
  endpointFor,
  markRejected,
  markRetryable,
  markSynced,
  pendingCount,
  pendingOperations,
  rejectedOperations,
  requeueEverything,
  retryRejected,
} from "./outbox.js";

// A drain already in flight. The triggers below can fire close together, and
// two concurrent drains would send every queued operation twice — harmless
// thanks to the backend's clientUuid dedupe, but it doubles the traffic for a
// gym whose connection was weak enough to need a queue in the first place.
let inFlight = null;

// A write that landed while a drain was already running. That drain read the
// queue before the new record existed, so without this the record would wait
// for the next trigger — which is exactly the bug that let a member sit
// unsynced until the app was reloaded.
let rerunRequested = false;

/**
 * Push everything queued, oldest first.
 *
 * Stops at the first retryable failure rather than skipping past it: later
 * operations reference earlier ones (a payment needs its member to exist), so
 * continuing past a gap would turn one transient failure into a run of
 * permanent rejections. The queue is left intact for the next attempt.
 *
 * @returns {Promise<{ synced: number, rejected: number, remaining: number }>}
 */
export function syncNow(options = {}) {
  if (inFlight) {
    rerunRequested = true;
    return inFlight;
  }
  inFlight = drainUntilQuiet(options).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// Coalesces the triggers: anything queued mid-drain is picked up by one more
// pass rather than waiting for the next trigger to come around.
async function drainUntilQuiet(options) {
  rerunRequested = false;
  const total = { synced: 0, rejected: 0, remaining: 0 };

  for (;;) {
    const result = await drain(options);
    total.synced += result.synced;
    total.rejected += result.rejected;
    total.remaining = result.remaining;

    // Stop when the network is down — the retry timer owns that case, and
    // looping here would just hammer an unreachable backend — or when nothing
    // new arrived while this pass was running.
    if (result.remaining > 0 || !rerunRequested) {
      return total;
    }
    rerunRequested = false;
  }
}

async function drain({ post = postJson } = {}) {
  const result = { synced: 0, rejected: 0, remaining: 0 };

  if (!isSyncConfigured()) {
    // An offline-only build. Records still queue, so pointing a later build at
    // a backend pushes the whole history rather than starting from empty.
    result.remaining = (await pendingOperations()).length;
    return result;
  }

  const queued = await pendingOperations();

  for (let index = 0; index < queued.length; index += 1) {
    const operation = queued[index];
    try {
      await post(endpointFor(operation.kind), operation.body);
      await markSynced(operation.id);
      result.synced += 1;
    } catch (error) {
      if (error instanceof SyncRejectedError) {
        // The backend understood this and refused it. Retrying changes nothing,
        // so it is set aside and the queue moves on.
        await markRejected(operation, error.message);
        result.rejected += 1;
        continue;
      }
      await markRetryable(operation, String(error?.message ?? error));
      result.remaining = queued.length - index;
      return result;
    }
  }

  return result;
}

/**
 * Push on three triggers, each covering a case the others miss:
 *
 *  1. **After every local write.** The common case at a gym with working wifi:
 *     staff register someone and it should be on the backend seconds later. An
 *     `online` event never fires here — the tablet was already online — so
 *     without this the record waits for the next app restart.
 *  2. **On the browser's `online` event.** The tablet was offline and has just
 *     regained a network; drain whatever accumulated.
 *  3. **On a retry timer, but only while something is still queued.** The
 *     browser reports `online` for a wifi network with no route to the backend,
 *     and fires no event when that route comes back. Without a timer, a tablet
 *     that failed one push would sit on it until someone happened to record
 *     something else. The timer stops as soon as the queue drains, so an idle
 *     tablet still polls nothing (TRD 7's "not polled continuously").
 *
 * @returns {() => void} stops listening
 */
export function startSync({ retryDelayMs = 60_000, ...options } = {}) {
  if (typeof window === "undefined") {
    return () => {};
  }

  let stopped = false;
  let retryTimer = null;

  const push = () => {
    if (stopped) return;
    clearTimeout(retryTimer);
    // Nothing here is awaited: startSync runs during render, and sync must
    // never delay a screen staff are waiting on.
    syncNow(options)
      .then((result) => {
        // Still queued means the backend was unreachable. Nothing will tell us
        // when it returns, so we have to come back and look.
        if (!stopped && result.remaining > 0) {
          retryTimer = setTimeout(push, retryDelayMs);
        }
      })
      .catch(() => {
        // Already recorded against the queued operation; there is no second
        // audience for it.
      });
  };

  const onQueued = () => {
    // Dexie fires this inside the write's own transaction, where the new row is
    // not yet committed and a drain would not see it. Deferring to the next
    // macrotask lets the transaction finish first.
    setTimeout(push, 0);
  };

  db.outbox.hook("creating", onQueued);
  window.addEventListener("online", push);
  if (navigator.onLine !== false) {
    push();
  }

  exposeDevHelpers(push);

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    window.removeEventListener("online", push);
    db.outbox.hook("creating").unsubscribe(onQueued);
  };
}

/**
 * Dev-only console access to the queue.
 *
 * Sync failures are silent to staff by design (PRD 4.10), which is right for
 * the front desk and useless for whoever has to work out why a member never
 * arrived. The modules are ES imports, so a devtools console cannot reach them
 * without this. Stripped from production builds, where there is no console to
 * type into and no reason to hand a page's scripts a lever on the sync queue.
 */
function exposeDevHelpers(push) {
  if (!import.meta.env?.DEV) return;
  window.rackinSync = {
    /** What is still waiting to be pushed. */
    pending: pendingOperations,
    pendingCount,
    /** What the backend refused, with the reason on `lastError`. */
    rejected: rejectedOperations,
    /** Re-queue refusals after fixing what caused them, then push. */
    async retryRejected() {
      const requeued = await retryRejected();
      push();
      return requeued;
    },
    /** Rebuild the queue from every local record and push it all again. */
    async resync() {
      const queued = await requeueEverything();
      push();
      return queued;
    },
    /** Push now, without waiting for a trigger. */
    push,
    /**
     * Erase every local record and the queue with it, returning this tablet to
     * a fresh install — the next member registered is #1001 again.
     *
     * Pass `{ keepStaff: true }` to keep the staff list and who is on the desk,
     * which is usually what you want when clearing test data: the roster is
     * throwaway, the staff list was set up deliberately.
     *
     * Local only. It cannot reach the backend, which keeps whatever was already
     * pushed; clearing that side is a separate, deliberate act.
     */
    wipeLocal: resetDatabase,
  };
}
