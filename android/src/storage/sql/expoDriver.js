// Adapts expo-sqlite to the driver contract queries.js expects — the real
// Task 3 adapter that testDriver.js's comment promised: "the real Phase 5
// adapter wraps expo-sqlite against this exact same contract instead —
// nothing in queries.js changes." It doesn't; this file is the only new
// code queries.js needed.
//
// expo-sqlite over op-sqlite: expo-sqlite ships inside the Expo Go client
// (confirmed running on a physical device, see docs/how-to/set-up-the-
// android-client.md), so the storage layer can be developed and tested the
// same Expo-Go-only way the QR camera work was (see
// Decisions/QR Scanning Uses expo-camera.md, which flagged this exact choice
// as still open). op-sqlite is a native module with no Expo Go build,
// forcing an EAS dev client before any storage code could even be tried.
//
// run()/all() map onto expo-sqlite's runAsync/getAllAsync almost by
// coincidence: runAsync already resolves { lastInsertRowId, changes }, the
// same shape testDriver.js returns from better-sqlite3's RunResult.
//
// transaction() uses raw BEGIN/COMMIT/ROLLBACK via execAsync rather than
// expo-sqlite's own withTransactionAsync, because that API's callback can't
// return a value — every caller here (see queries.js's transaction) needs
// the result of the writes it just made.

export function createExpoDriver(db) {
  function run(sql, params = []) {
    return db.runAsync(sql, params);
  }

  function all(sql, params = []) {
    return db.getAllAsync(sql, params);
  }

  async function transaction(fn) {
    await db.execAsync("BEGIN");
    try {
      const result = await fn({ run, all });
      await db.execAsync("COMMIT");
      return result;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
  }

  return { run, all, transaction };
}
