// Store / daily cash ledger (Task 4's Store proposal, now active work).
// Front-desk sales outside membership (water, treadmill/incline time) and
// small cash expenses (stock, repairs), kept as their own ledger — separate
// from the Payments domain by explicit product decision (2026-08-22): Store
// income never folds into membership payment totals.
//
// Water and Stair Incline are fixed-price, one-tap items (STORE_ITEMS) —
// still the Kinetic Court mockup's illustrative figures, not yet confirmed
// as the gym's real prices. Treadmill is different by explicit product
// decision (2026-08-22): a session can run longer than 30 minutes, so it
// isn't a single fixed price — tapping it opens an amount entry instead of
// selling instantly (see TreadmillSaleSheet.jsx). Only its 30-min rate (40)
// is confirmed; that's carried as a prefill hint, not a price cap.

import { generateClientUuid, store } from "../storage/store.js";
import { enqueue } from "../sync/outbox.js";
import { attributionFor, getOnDesk } from "./staff.js";

export const STORE_ITEMS = [
  { key: "water", label: "Water", price: 20 },
  { key: "stairIncline", label: "30-min Stair Incline", price: 50 },
];

export const TREADMILL_ITEM = { key: "treadmill", label: "Treadmill", suggestedAmount: 40 };

async function record({ type, itemKey, description, amount, recordedBy }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Enter an amount.");
  }

  const occurredAt = new Date().toISOString();
  const clientUuid = generateClientUuid();
  // Same "undefined means take the shift default, explicit null is a real
  // answer" contract as payments.js/checkIn.js.
  const attribution = attributionFor(
    recordedBy === undefined ? await getOnDesk() : recordedBy,
  );

  const transaction = {
    type,
    itemKey: itemKey ?? null,
    description,
    amount: numericAmount,
    occurredAt,
    clientUuid,
    ...attribution,
  };

  const id = await store.transaction(["storeTransactions", "outbox"], async (tx) => {
    const txId = await tx.storeTransactions.add(transaction);
    await enqueue(tx, "store", {
      type,
      itemKey: itemKey ?? null,
      description,
      amount: numericAmount,
      occurredAt,
      clientUuid,
      ...attribution,
    });
    return txId;
  });

  return { ...transaction, id };
}

/**
 * One-tap sale of a fixed-price item.
 * @param {string} itemKey one of STORE_ITEMS' keys
 * @param {{ recordedBy?: object|null }} [options]
 */
export function sellItem(itemKey, { recordedBy } = {}) {
  const item = STORE_ITEMS.find((entry) => entry.key === itemKey);
  if (!item) {
    throw new Error("Unknown item.");
  }
  return record({
    type: "income",
    itemKey: item.key,
    description: item.label,
    amount: item.price,
    recordedBy,
  });
}

/**
 * Sell a treadmill session for a staff-entered amount — unlike sellItem's
 * fixed price, duration (and so amount) varies session to session.
 * @param {number} amount
 * @param {{ recordedBy?: object|null }} [options]
 */
export function sellTreadmill(amount, { recordedBy } = {}) {
  return record({
    type: "income",
    itemKey: TREADMILL_ITEM.key,
    description: TREADMILL_ITEM.label,
    amount,
    recordedBy,
  });
}

/**
 * A staff expense paid out of the day's cash on hand. Amount is freeform,
 * unlike sellItem's fixed price — expenses vary (stock, repairs).
 * @param {{ description: string, amount: number, recordedBy?: object|null }} input
 */
export function logExpense({ description, amount, recordedBy } = {}) {
  const trimmed = String(description ?? "").trim();
  if (!trimmed) {
    throw new Error("Describe the expense.");
  }
  return record({
    type: "expense",
    itemKey: null,
    description: trimmed,
    amount,
    recordedBy,
  });
}

function startOfLocalDay(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

/**
 * Today's transactions, most recent first. Cash On Hand resets daily by
 * explicit product decision — there is no closing-out flow yet, so "today"
 * is simply everything since local midnight, the same boundary
 * getTodaysActivity uses for check-ins.
 */
export async function getTodayTransactions() {
  const dayStart = startOfLocalDay();
  const todays = await store.storeTransactions.where("occurredAt").aboveOrEqual(dayStart).toArray();
  return todays.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

/** Income / expenses / cash-on-hand for today. */
export async function getTodayTotals() {
  const transactions = await getTodayTransactions();
  const income = transactions
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = transactions
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  return { income, expenses, cashOnHand: income - expenses };
}
