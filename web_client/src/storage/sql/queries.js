// SQL implementation of the storage interface (../store.js),
// generic over any driver satisfying { run(sql, params), all(sql, params),
// transaction(fn) }. better-sqlite3 (Node, for proving this file's SQL is
// correct — see queries.test.js) and expo-sqlite (React Native, once Phase 5
// scaffolds a project) both implement that shape.
//
// Unlike store.js, transaction() here has no ambient option at all — a raw
// SQL backend has nothing like Dexie's automatic transaction-join, so every
// caller already threads the explicit `tx` (Task 2 Phase 1 was changed to
// match this before this file was written).

import { PRIMARY_KEYS } from "./schema.js";

const TABLE_NAMES = Object.keys(PRIMARY_KEYS);

// outbox.body is the only column that isn't a plain scalar — everything else
// in this schema is a string or number Dexie would have stored natively too.
function serializeRecord(name, record) {
  if (name !== "outbox" || !("body" in record)) return record;
  return { ...record, body: JSON.stringify(record.body) };
}

function deserializeRow(name, row) {
  if (!row || name !== "outbox") return row;
  return { ...row, body: JSON.parse(row.body) };
}

function deserializeRows(name, rows) {
  return rows.map((row) => deserializeRow(name, row));
}

function sqlTable(driver, name, notify) {
  const primaryKey = PRIMARY_KEYS[name];

  async function get(key) {
    const rows = await driver.all(`SELECT * FROM ${name} WHERE ${primaryKey} = ?`, [key]);
    return deserializeRow(name, rows[0]);
  }

  async function toArray() {
    return deserializeRows(name, await driver.all(`SELECT * FROM ${name}`, []));
  }

  async function bulkGet(keys) {
    if (keys.length === 0) return [];
    const placeholders = keys.map(() => "?").join(", ");
    const rows = await driver.all(
      `SELECT * FROM ${name} WHERE ${primaryKey} IN (${placeholders})`,
      keys,
    );
    const byKey = new Map(rows.map((row) => [row[primaryKey], row]));
    // Preserves input order and leaves misses as undefined, matching Dexie's
    // bulkGet contract that callers (e.g. getTodaysActivity) rely on.
    return keys.map((key) => deserializeRow(name, byKey.get(key)));
  }

  async function add(record) {
    const toStore = serializeRecord(name, record);
    const columns = Object.keys(toStore);
    const placeholders = columns.map(() => "?").join(", ");
    const result = await driver.run(
      `INSERT INTO ${name} (${columns.join(", ")}) VALUES (${placeholders})`,
      columns.map((column) => toStore[column]),
    );
    const key = record[primaryKey] ?? result.lastInsertRowId;
    notify(name, { ...record, [primaryKey]: key });
    return key;
  }

  async function put(record) {
    const toStore = serializeRecord(name, record);
    const columns = Object.keys(toStore);
    const placeholders = columns.map(() => "?").join(", ");
    const updates = columns
      .filter((column) => column !== primaryKey)
      .map((column) => `${column} = excluded.${column}`)
      .join(", ");
    await driver.run(
      `INSERT INTO ${name} (${columns.join(", ")}) VALUES (${placeholders})
       ON CONFLICT(${primaryKey}) DO UPDATE SET ${updates}`,
      columns.map((column) => toStore[column]),
    );
    return record[primaryKey];
  }

  async function update(key, changes) {
    const toStore = serializeRecord(name, changes);
    const columns = Object.keys(toStore);
    const assignments = columns.map((column) => `${column} = ?`).join(", ");
    await driver.run(`UPDATE ${name} SET ${assignments} WHERE ${primaryKey} = ?`, [
      ...columns.map((column) => toStore[column]),
      key,
    ]);
  }

  async function del(key) {
    await driver.run(`DELETE FROM ${name} WHERE ${primaryKey} = ?`, [key]);
  }

  async function clear() {
    await driver.run(`DELETE FROM ${name}`, []);
  }

  async function count() {
    const rows = await driver.all(`SELECT COUNT(*) AS count FROM ${name}`, []);
    return rows[0].count;
  }

  function where(field) {
    return {
      equals(value) {
        const load = async () =>
          deserializeRows(
            name,
            await driver.all(`SELECT * FROM ${name} WHERE ${field} = ?`, [value]),
          );
        return {
          toArray: load,
          count: async () => {
            const rows = await driver.all(
              `SELECT COUNT(*) AS count FROM ${name} WHERE ${field} = ?`,
              [value],
            );
            return rows[0].count;
          },
          // Same semantics as Dexie's .and(): the equals clause narrows via
          // SQL, the arbitrary JS predicate narrows further in memory.
          and: (predicate) => ({
            toArray: async () => (await load()).filter(predicate),
            count: async () => (await load()).filter(predicate).length,
          }),
        };
      },
      aboveOrEqual(value) {
        return {
          toArray: async () =>
            deserializeRows(
              name,
              await driver.all(`SELECT * FROM ${name} WHERE ${field} >= ?`, [value]),
            ),
        };
      },
      anyOf(values) {
        return {
          modify: async (changes) => {
            if (values.length === 0) return;
            const toStore = serializeRecord(name, changes);
            const columns = Object.keys(toStore);
            const assignments = columns.map((column) => `${column} = ?`).join(", ");
            const placeholders = values.map(() => "?").join(", ");
            await driver.run(
              `UPDATE ${name} SET ${assignments} WHERE ${field} IN (${placeholders})`,
              [...columns.map((column) => toStore[column]), ...values],
            );
          },
        };
      },
    };
  }

  return { get, toArray, bulkGet, add, put, update, delete: del, clear, count, where };
}

/**
 * @param {{ run: Function, all: Function, transaction: Function }} driver
 */
export function createSqlStore(driver) {
  const listeners = new Map();

  function notifyNow(name, record) {
    for (const callback of listeners.get(name) ?? []) callback(record);
  }

  function onCreate(name, callback) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(callback);
    return () => listeners.get(name)?.delete(callback);
  }

  function buildTables(scopedDriver, notify) {
    const tables = {};
    for (const name of TABLE_NAMES) {
      tables[name] = {
        ...sqlTable(scopedDriver, name, notify),
        onCreate: (callback) => onCreate(name, callback),
      };
    }
    return tables;
  }

  const tables = buildTables(driver, notifyNow);

  return {
    ...tables,

    // Notifications made during the transaction are held back and only fired
    // once it actually commits — an insert that gets rolled back must never
    // have told anything it happened. (This is stricter than the Dexie
    // adapter, whose "creating" hook fires before its transaction commits;
    // see store.js's onCreate comment.)
    transaction(tableNames, fn) {
      const pending = [];
      const deferredNotify = (name, record) => pending.push([name, record]);
      return driver
        .transaction((txDriver) => {
          const txTables = buildTables(txDriver, deferredNotify);
          const tx = {};
          for (const name of tableNames) tx[name] = txTables[name];
          return fn(tx);
        })
        .then((result) => {
          for (const [name, record] of pending) notifyNow(name, record);
          return result;
        });
    },
  };
}
