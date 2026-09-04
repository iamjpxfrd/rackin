// One-way push, tablet → backend (TRD 7). Ported from server/src/sync/sync.js.
//
// The tablet stays authoritative and the backend never pushes changes back:
// with one device in the pilot (ADR-001) there is nothing to reconcile, and a
// two-way sync would introduce conflict resolution the product does not need.
//
// Every failure here is silent. Sync is additive — no local flow depends on it,
// so surfacing a sync error to staff would report a problem they cannot act on
// and did not cause (PRD 4.10).
//
// Three differences from the web version, all in startSync():
//  - There's no `window`/`navigator.onLine`/`online` event in RN. Connectivity
//    comes from @react-native-community/netinfo instead (ships in Expo Go,
//    same Expo-Go-first reasoning as every other native-module choice in this
//    port) — subscribed via NetInfo.addEventListener, with a push triggered on
//    the offline→online transition the same way the browser's 'online' event
//    triggered one.
//  - store.outbox.onCreate() needs the store to already be open, and opening
//    expo-sqlite is inherently async — so startSync() itself is async here and
//    resolves to the stop function, instead of returning it synchronously.
//  - import.meta.env.DEV and `window.rackinSync` become RN's `__DEV__` global
//    and `global.rackinSync`.

import NetInfo from "@react-native-community/netinfo";
import { resetDatabase, store } from "../storage/store.js";
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
      await reportSyncStatus(options);
      return total;
    }
    rerunRequested = false;
  }
}

// Tells the backend how the queue looks after this drain settled — caught up
// or still stuck, and how far behind — so the owner dashboard can tell a
// current tablet from one that has gone quiet (ADR-002 Action Item 8). Runs
// on every existing sync trigger rather than a new timer of its own, which
// is enough: a queue only grows while the gym is actively recording
// something, and that always runs through a drain.
async function reportSyncStatus({ post = postJson } = {}) {
  if (!isSyncConfigured()) return;
  try {
    const queued = await pendingOperations();
    await post("/api/sync/status", {
      pendingCount: queued.length,
      oldestPendingAt: queued[0]?.queuedAt ?? null,
    });
  } catch {
    // Best-effort, same as every other failure in this file (PRD 4.10) — a
    // failed report must never surface to staff or block a retry.
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
 *     staff register someone and it should be on the backend seconds later. A
 *     connectivity transition never fires here — the tablet was already
 *     online — so without this the record waits for the next app restart.
 *  2. **On a NetInfo offline→online transition.** The tablet was offline and
 *     has just regained a network; drain whatever accumulated.
 *  3. **On a retry timer, but only while something is still queued.** NetInfo
 *     reports connected for a wifi network with no route to the backend, and
 *     fires no event when that route comes back. Without a timer, a tablet
 *     that failed one push would sit on it until someone happened to record
 *     something else. The timer stops as soon as the queue drains, so an idle
 *     tablet still polls nothing (TRD 7's "not polled continuously").
 *
 * @returns {Promise<() => void>} resolves to a function that stops listening
 */
export async function startSync({ retryDelayMs = 60_000, ...options } = {}) {
  let stopped = false;
  let retryTimer = null;
  let wasConnected = null;

  const push = () => {
    if (stopped) return;
    clearTimeout(retryTimer);
    // Nothing here is awaited: startSync's caller must never have sync delay a
    // screen staff are waiting on.
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
    // Fires inside the write's own transaction, where the new row is not yet
    // committed and a drain would not see it. Deferring to the next macrotask
    // lets the transaction finish first.
    setTimeout(push, 0);
  };

  const onConnectivityChange = (state) => {
    const isConnected = state.isConnected === true;
    if (isConnected && wasConnected === false) {
      push();
    }
    wasConnected = isConnected;
  };

  const stopWatchingOutbox = store.outbox.onCreate(onQueued);
  const unsubscribeNetInfo = NetInfo.addEventListener(onConnectivityChange);

  const initial = await NetInfo.fetch();
  wasConnected = initial.isConnected === true;
  if (!stopped && wasConnected) {
    push();
  }

  exposeDevHelpers(push);

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    unsubscribeNetInfo();
    stopWatchingOutbox();
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
  if (!__DEV__) return;
  global.rackinSync = {
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
