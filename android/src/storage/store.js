// The RN storage entry point (Task 3) — mirrors server/src/storage/store.js's
// public shape (store, generateClientUuid, getNextMemberId, resetDatabase) so
// domain code ported from server/src/domain/ can switch its import path and
// nothing else. Two real differences from the Dexie-backed original:
//
// 1. Opening a SQLite database is inherently async here (expo-sqlite has no
//    synchronous open), where Dexie's db.table() was always ready. `store`
//    below is a *lazy* proxy: every method call awaits the real, once-opened
//    store internally and returns a promise, so domain code that already
//    does `await store.members.get(id)` needs no changes at all — it was
//    already awaiting a promise, just one that used to resolve instantly.
//    getStore() is still exported for the one caller (App.js) that needs the
//    resolved object directly, e.g. to confirm the db actually opened.
//
// 2. Dexie's liveQuery dependency-tracking has no RN/SQLite equivalent, so
//    there's nothing for components to subscribe to the way the web app's
//    useLiveQuery does automatically. onStoreChange()/notifyChanged() below
//    is what ../hooks/useLiveQuery.js polls instead — see that file for the
//    full reasoning (global invalidation, not per-table, deliberately).

import * as SQLite from "expo-sqlite";
import { applySchema } from "./sql/schema.js";
import { createExpoDriver } from "./sql/expoDriver.js";
import { createSqlStore } from "./sql/queries.js";

let storePromise = null;

/** Opens (or returns the already-open) on-device database. Safe to call from multiple places — the open only happens once. */
export function getStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const db = await SQLite.openDatabaseAsync("rackin.db");
      const driver = createExpoDriver(db);
      await applySchema(driver);
      return createSqlStore(driver);
    })();
  }
  return storePromise;
}

const changeListeners = new Set();

/** Fires after any write commits, anywhere — see useLiveQuery.js for why this is global rather than per-table. */
function notifyChanged() {
  for (const callback of changeListeners) callback();
}

/** Subscribe to "something changed somewhere". Returns an unsubscribe function. */
export function onStoreChange(callback) {
  changeListeners.add(callback);
  return () => changeListeners.delete(callback);
}

async function withChangeNotify(promise) {
  const result = await promise;
  notifyChanged();
  return result;
}

function lazyWhere(name, field) {
  return {
    equals(value) {
      const clause = () => getStore().then((s) => s[name].where(field).equals(value));
      return {
        toArray: () => clause().then((c) => c.toArray()),
        count: () => clause().then((c) => c.count()),
        and: (predicate) => ({
          toArray: () => clause().then((c) => c.and(predicate).toArray()),
          count: () => clause().then((c) => c.and(predicate).count()),
        }),
      };
    },
    aboveOrEqual(value) {
      return {
        toArray: () =>
          getStore().then((s) => s[name].where(field).aboveOrEqual(value).toArray()),
      };
    },
    anyOf(values) {
      return {
        modify: (changes) =>
          withChangeNotify(
            getStore().then((s) => s[name].where(field).anyOf(values).modify(changes)),
          ),
      };
    },
  };
}

/**
 * A table object with the same shape as the real store's, except every
 * method awaits the db open internally instead of assuming it already
 * happened — see the file header for why that's safe for existing callers.
 */
function lazyTable(name) {
  return {
    get: (key) => getStore().then((s) => s[name].get(key)),
    toArray: () => getStore().then((s) => s[name].toArray()),
    bulkGet: (keys) => getStore().then((s) => s[name].bulkGet(keys)),
    add: (record) => withChangeNotify(getStore().then((s) => s[name].add(record))),
    put: (record) => withChangeNotify(getStore().then((s) => s[name].put(record))),
    update: (key, changes) =>
      withChangeNotify(getStore().then((s) => s[name].update(key, changes))),
    delete: (key) => withChangeNotify(getStore().then((s) => s[name].delete(key))),
    clear: () => withChangeNotify(getStore().then((s) => s[name].clear())),
    count: () => getStore().then((s) => s[name].count()),
    where: (field) => lazyWhere(name, field),
    // Insert-only, unlike onStoreChange — see sync.js, the one caller that
    // needs "a row was added" specifically rather than "something changed".
    onCreate(callback) {
      let unsubscribe = () => {};
      let cancelled = false;
      getStore().then((s) => {
        if (cancelled) return;
        unsubscribe = s[name].onCreate(callback);
      });
      return () => {
        cancelled = true;
        unsubscribe();
      };
    },
  };
}

export const store = {
  members: lazyTable("members"),
  payments: lazyTable("payments"),
  checkIns: lazyTable("checkIns"),
  outbox: lazyTable("outbox"),
  staff: lazyTable("staff"),
  deviceState: lazyTable("deviceState"),
  storeTransactions: lazyTable("storeTransactions"),

  transaction(tableNames, fn) {
    return withChangeNotify(getStore().then((s) => s.transaction(tableNames, fn)));
  },
};

export function generateClientUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Sequential member id assignment, starting at 1001 — matches the backend's numbering scheme. */
export async function getNextMemberId() {
  return String(1001 + (await store.members.count()));
}

/** Wipe all local data. Dev/testing convenience only — never exposed in the staff-facing UI. */
export async function resetDatabase({ keepStaff = false } = {}) {
  await store.members.clear();
  await store.payments.clear();
  await store.checkIns.clear();
  await store.outbox.clear();
  await store.storeTransactions.clear();

  if (!keepStaff) {
    await store.staff.clear();
    await store.deviceState.clear();
  }
}
