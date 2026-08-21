// The RN storage entry point (Task 3) — mirrors server/src/storage/store.js's
// public shape (store, generateClientUuid, getNextMemberId, resetDatabase) so
// domain code ported from server/src/domain/ can switch its import and
// nothing else. The one real difference: opening a SQLite database is
// inherently async here (expo-sqlite has no synchronous open on the New
// Architecture bridge the Expo Go client uses), so callers must await
// getStore() once at startup instead of importing a ready-made `store`.
//
// generateClientUuid's fallback branch (no crypto.randomUUID) is copied
// as-is from server/db/db.js — React Native's JS runtime has no global
// `crypto` either, so the same fallback that covers old WebViews there
// covers RN here for free.

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
  const store = await getStore();
  return String(1001 + (await store.members.count()));
}

/** Wipe all local data. Dev/testing convenience only — never exposed in the staff-facing UI. */
export async function resetDatabase({ keepStaff = false } = {}) {
  const store = await getStore();
  await store.members.clear();
  await store.payments.clear();
  await store.checkIns.clear();
  await store.outbox.clear();

  if (!keepStaff) {
    await store.staff.clear();
    await store.deviceState.clear();
  }
}
