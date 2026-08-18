// Adapts better-sqlite3 to the driver contract queries.js expects. Test-only:
// this proves the SQL in queries.js/schema.js is correct without an Expo
// project or a device. The real Phase 5 adapter wraps expo-sqlite against
// this exact same contract instead — nothing in queries.js changes.

export function createTestDriver(db) {
  function run(sql, params = []) {
    const info = db.prepare(sql).run(...params);
    return Promise.resolve({ lastInsertRowId: info.lastInsertRowid, changes: info.changes });
  }

  function all(sql, params = []) {
    return Promise.resolve(db.prepare(sql).all(...params));
  }

  async function transaction(fn) {
    db.exec("BEGIN");
    try {
      const result = await fn({ run, all });
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  return { run, all, transaction };
}
