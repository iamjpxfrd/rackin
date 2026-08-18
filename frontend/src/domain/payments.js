// Recording payments for existing members (frontend-spec.md §5.4, PRD 4.7).

import { generateClientUuid, store } from "../storage/store.js";
import { enqueue } from "../sync/outbox.js";
import { computeCoversUntil, deriveStatus, latestPaymentOf } from "./membership.js";
import { attributionFor, getOnDesk } from "./staff.js";

/**
 * Extends coverage from the payment date + the member's plan duration.
 *
 * `recordedBy` is who takes responsibility for the money. It defaults to
 * whoever is on the desk, but the caller passes it explicitly because the
 * payment sheet confirms it — a handover nobody remembered to record shows up
 * here, at the one moment where getting it wrong costs the gym something.
 *
 * @param {{
 *   memberId: string, amount: number, method: "cash"|"transfer",
 *   recordedBy?: object|null,
 * }} input
 * @returns {Promise<{ payment: object, coversUntil: string, status: string }>}
 */
export async function recordPayment({ memberId, amount, method, recordedBy }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Enter the amount received.");
  }
  if (method !== "cash" && method !== "transfer") {
    throw new Error("Choose a payment method.");
  }

  const member = await store.members.get(memberId);
  if (!member) {
    throw new Error(`No member found for #${memberId}`);
  }

  const paidAt = new Date().toISOString();
  const coversUntil = computeCoversUntil(paidAt, member.planType);

  // `undefined` means the caller did not express a preference, so fall back to
  // the shift. An explicit `null` means nobody is signed in, and is preserved
  // as the honest record of an unattributed payment.
  const attribution = attributionFor(
    recordedBy === undefined ? await getOnDesk() : recordedBy,
  );

  const payment = {
    memberId,
    amount: numericAmount,
    method,
    paidAt,
    coversUntil,
    clientUuid: generateClientUuid(),
    ...attribution,
  };

  // Payment row and queue entry commit together, so a payment can never be
  // taken locally and then silently never pushed (sync/outbox.js).
  const id = await store.transaction(["payments", "outbox"], async (tx) => {
    const paymentId = await tx.payments.add(payment);
    // paidAt travels with it: the backend counts coverage from when the member
    // paid, not from whenever this tablet next finds a network (TRD 7).
    await enqueue(tx, "payment", {
      memberId,
      amount: numericAmount,
      method,
      clientUuid: payment.clientUuid,
      paidAt,
      ...attribution,
    });
    return paymentId;
  });

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
  const payments = await store.payments.where("memberId").equals(memberId).toArray();
  return latestPaymentOf(payments)?.amount ?? null;
}
