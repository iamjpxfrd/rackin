// Recording payments for existing members (frontend-spec.md §5.4, PRD 4.7).

import { db, generateClientUuid } from "../../db/db.js";
import { computeCoversUntil, deriveStatus, latestPaymentOf } from "./membership.js";

/**
 * Extends coverage from the payment date + the member's plan duration.
 *
 * @param {{ memberId: string, amount: number, method: "cash"|"transfer" }} input
 * @returns {Promise<{ payment: object, coversUntil: string, status: string }>}
 */
export async function recordPayment({ memberId, amount, method }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Enter the amount received.");
  }
  if (method !== "cash" && method !== "transfer") {
    throw new Error("Choose a payment method.");
  }

  const member = await db.members.get(memberId);
  if (!member) {
    throw new Error(`No member found for #${memberId}`);
  }

  const paidAt = new Date().toISOString();
  const coversUntil = computeCoversUntil(paidAt, member.planType);

  const payment = {
    memberId,
    amount: numericAmount,
    method,
    paidAt,
    coversUntil,
    clientUuid: generateClientUuid(),
  };
  const id = await db.payments.add(payment);

  return {
    payment: { ...payment, id },
    coversUntil,
    status: deriveStatus({ coversUntil }).status,
  };
}

/**
 * The member's most recent payment amount, used to prefill the payment
 * sheet. Derived from their own history — never an invented price list
 * (PRODUCT.md forbids fabricating pilot specifics).
 *
 * @returns {Promise<number|null>}
 */
export async function getLastPaymentAmount(memberId) {
  const payments = await db.payments.where("memberId").equals(memberId).toArray();
  return latestPaymentOf(payments)?.amount ?? null;
}
