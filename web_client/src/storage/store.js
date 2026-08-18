// The storage interface — the only way domain and sync code touches
// persistence (Task 2, Phase 1). Backed by Dexie today; an RN adapter with
// this same shape (e.g. over SQLite) can replace it without any domain file
// changing. Only the operators domain code actually uses are exposed —
// this is not a general-purpose Dexie clone.
//
// Table wrappers still call the real Dexie Table methods underneath, so
// Dexie's liveQuery dependency-tracking (which watches at the Table/WhereClause
// level) keeps working for every component using useLiveQuery, unchanged.

import { db } from "../../db/db.js";

function table(name) {
  const t = db.table(name);
  return {
    get: (key) => t.get(key),
    toArray: () => t.toArray(),
    bulkGet: (keys) => t.bulkGet(keys),
    add: (record) => t.add(record),
    put: (record) => t.put(record),
    update: (key, changes) => t.update(key, changes),
    delete: (key) => t.delete(key),
    clear: () => t.clear(),
    count: () => t.count(),
    where(field) {
      return {
        equals(value) {
          const clause = t.where(field).equals(value);
          return {
            toArray: () => clause.toArray(),
            count: () => clause.count(),
            and: (predicate) => {
              const filtered = clause.and(predicate);
              return { toArray: () => filtered.toArray(), count: () => filtered.count() };
            },
          };
        },
        aboveOrEqual(value) {
          const clause = t.where(field).aboveOrEqual(value);
          return { toArray: () => clause.toArray() };
        },
        anyOf(values) {
          const clause = t.where(field).anyOf(values);
          return { modify: (changes) => clause.modify(changes) };
        },
      };
    },
    // Fires synchronously while the creating write is still uncommitted —
    // callers that need the row itself should re-read after the transaction
    // resolves, not rely on hook arguments.
    onCreate(callback) {
      t.hook("creating", callback);
      return () => t.hook("creating").unsubscribe(callback);
    },
  };
}

export const store = {
  members: table("members"),
  payments: table("payments"),
  checkIns: table("checkIns"),
  outbox: table("outbox"),
  staff: table("staff"),
  deviceState: table("deviceState"),

  // `fn` receives an explicit `tx` — not Dexie's ambient transaction — because
  // ambient-join only works here because Dexie tracks it for free. A raw-SQL
  // backend (the Phase 2 adapter) has no equivalent mechanism, so every write
  // that must commit atomically has to go through the handle it was given,
  // not through `store.<table>` directly.
  transaction(tableNames, fn) {
    const tx = {};
    for (const name of tableNames) tx[name] = table(name);
    return db.transaction("rw", ...tableNames.map((name) => db.table(name)), () => fn(tx));
  },
};

export { generateClientUuid } from "../../db/db.js";

/**
 * Sequential member id assignment, starting at 1001 — matches the backend's
 * numbering scheme (see db.js). Reimplemented over `store` rather than
 * imported from db.js so this stays swappable with the RN adapter.
 */
export async function getNextMemberId() {
  return String(1001 + (await store.members.count()));
}

/**
 * Wipe all local data. Dev/testing convenience only — never exposed in the
 * staff-facing UI.
 */
export async function resetDatabase({ keepStaff = false } = {}) {
  await store.members.clear();
  await store.payments.clear();
  await store.checkIns.clear();
  await store.outbox.clear();

  if (!keepStaff) {
    await store.staff.clear();
    await store.deviceState.clear();
  }
}
