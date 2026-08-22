// Store / daily cash ledger (Task 4's Store proposal, now active work).
// Front-desk sales outside membership (water, treadmill/incline time) and
// small cash expenses (stock, repairs).
//
// Water is a fixed-price, one-tap item (STORE_ITEMS) — still the Kinetic
// Court mockup's illustrative figure, not yet confirmed as the gym's real
// price. Treadmill and Stair Incline are different by explicit product
// decision (2026-08-22): a session can run longer than 30 minutes, so
// neither is a single fixed price — tapping either opens an amount entry
// instead of selling instantly (see TimedSaleSheet.jsx). Only Treadmill's
// 30-min rate (40) is confirmed; both suggestedAmount figures are carried as
// a prefill hint, not a price cap.
//
// Membership payments joined in (2026-08-22, reversing the original "Store
// income never folds into membership totals" decision): every payment —
// registration's first payment or a renewal, whatever plan — now shows up
// in getTodayTransactions()/getTodayTotals() alongside Store's own sales, so
// staff see one full log of the day's money rather than two. The split by
// method matters here: Income counts every payment regardless of method
// (cash or transfer), but Cash On Hand only counts cash — a transfer never
// puts physical cash in the drawer, so folding it in would make "cash on
// hand" lie. Store's own sales/expenses have no method field of their own;
// they're walk-up cash transactions by nature, so they always count as cash.

import { generateClientUuid, store } from "../storage/store.js";
import { enqueue } from "../sync/outbox.js";
import { attributionFor, getOnDesk } from "./staff.js";
import { planLabel } from "./constants.js";

export const STORE_ITEMS = [{ key: "water", label: "Water", price: 20 }];

export const TIMED_ITEMS = [
  { key: "treadmill", label: "Treadmill", suggestedAmount: 40 },
  { key: "stairIncline", label: "Stair Incline", suggestedAmount: 50 },
];

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
 * Log a timed item (Treadmill/Stair Incline) for a staff-entered amount —
 * unlike sellItem's fixed price, duration (and so amount) varies session to
 * session.
 * @param {string} itemKey one of TIMED_ITEMS' keys
 * @param {number} amount
 * @param {{ recordedBy?: object|null }} [options]
 */
export function sellTimedItem(itemKey, amount, { recordedBy } = {}) {
  const item = TIMED_ITEMS.find((entry) => entry.key === itemKey);
  if (!item) {
    throw new Error("Unknown item.");
  }
  return record({
    type: "income",
    itemKey: item.key,
    description: item.label,
    amount,
    recordedBy,
  });
}

/**
 * A manually-logged transaction — income or expense, freeform description
 * and amount. This is the one way to log store income beyond the fixed
 * Water tile/Treadmill/Stair Incline (a walk-in sundry sale, say), and the
 * only way to log an expense. Unlike sellItem/sellTimedItem, nothing here
 * is item-driven — both the type and the amount are staff-entered.
 * @param {{ type: "income"|"expense", description: string, amount: number, recordedBy?: object|null }} input
 */
export function logTransaction({ type, description, amount, recordedBy } = {}) {
  if (type !== "income" && type !== "expense") {
    throw new Error("Choose income or expense.");
  }
  const trimmed = String(description ?? "").trim();
  if (!trimmed) {
    throw new Error(type === "income" ? "Describe the income." : "Describe the expense.");
  }
  return record({
    type,
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
 * Today's membership payments (registration's first payment or a renewal),
 * reshaped to the same {type, description, amount, occurredAt, method}
 * shape as a storeTransactions row so the two can render and total
 * together. Read-only join against store.payments/store.members — nothing
 * is written to storeTransactions for these, so a payment stays the single
 * source of truth in its own table.
 */
async function getTodayPaymentsAsTransactions() {
  const dayStart = startOfLocalDay();
  const payments = await store.payments.where("paidAt").aboveOrEqual(dayStart).toArray();
  if (payments.length === 0) return [];

  const memberIds = [...new Set(payments.map((payment) => payment.memberId))];
  const members = await store.members.bulkGet(memberIds);
  const memberById = new Map(memberIds.map((id, index) => [id, members[index]]));

  return payments.map((payment) => {
    const member = memberById.get(payment.memberId);
    return {
      id: `payment-${payment.id}`,
      type: "income",
      itemKey: null,
      description: `${planLabel(member?.planType)} — ${member?.name ?? "Unknown member"}`,
      amount: payment.amount,
      occurredAt: payment.paidAt,
      method: payment.method,
      source: "payment",
      memberId: payment.memberId,
    };
  });
}

/**
 * Today's transactions, most recent first — Store's own sales/expenses plus
 * today's membership payments, merged. Cash On Hand resets daily by
 * explicit product decision — there is no closing-out flow yet, so "today"
 * is simply everything since local midnight, the same boundary
 * getTodaysActivity uses for check-ins.
 */
export async function getTodayTransactions() {
  const dayStart = startOfLocalDay();
  const [storeEntries, paymentEntries] = await Promise.all([
    store.storeTransactions.where("occurredAt").aboveOrEqual(dayStart).toArray(),
    getTodayPaymentsAsTransactions(),
  ]);

  const combined = [
    // Store's own income/expenses have no method of their own — a walk-up
    // sale or a cash expense is cash by nature, so it's stamped here for
    // getTodayTotals' cash-only Cash On Hand split, not persisted on the row.
    ...storeEntries.map((entry) => ({ ...entry, source: "store", method: "cash" })),
    ...paymentEntries,
  ];
  return combined.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

/**
 * Income / expenses / cash-on-hand for today. Income counts every payment
 * regardless of method; Cash On Hand counts only cash — see the file header
 * for why that split matters.
 */
export async function getTodayTotals() {
  const transactions = await getTodayTransactions();
  const income = transactions
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = transactions
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const cashIncome = transactions
    .filter((entry) => entry.type === "income" && entry.method === "cash")
    .reduce((sum, entry) => sum + entry.amount, 0);
  return { income, expenses, cashOnHand: cashIncome - expenses };
}
