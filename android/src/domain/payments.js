// Recording payments for existing members (frontend-spec.md §5.4, PRD 4.7).

import { generateClientUuid, store } from "../storage/store.js";
import { enqueue } from "../sync/outbox.js";
import { computeCoversUntil, deriveStatus, latestPaymentOf } from "./membership.js";
import { attributionFor, getOnDesk } from "./staff.js";
import { PLAN_TYPES } from "./constants.js";

/**
 * Extends coverage by the plan's duration, stacked on top of the member's
 * remaining coverage (or the payment date, if they've lapsed) — see
 * computeCoversUntil for the extend rule.
 *
 * `recordedBy` is who takes responsibility for the money. It defaults to
 * whoever is on the desk, but the caller passes it explicitly because the
 * payment sheet confirms it — a handover nobody remembered to record shows up
 * here, at the one moment where getting it wrong costs the gym something.
 *
 * `planType` is optional and defaults to the member's current plan — a plain
 * renewal doesn't change it. Passing a different one (e.g. a Session drop-in
 * deciding to go Monthly) updates the member's stored plan in the same
 * transaction as the payment, so the switch and the money that paid for it
 * are one atomic record rather than two separate edits.
 *
 * `isStudent` works the same way — optional, defaults to the member's
 * current membership type. A member's student/regular status can change
 * (graduation, etc.), and the renewal that reflects the correction should
 * record it rather than needing a separate edit.
 *
 * @param {{
 *   memberId: string, amount: number, method: "cash"|"transfer",
 *   planType?: "session"|"weekly"|"monthly"|"annually",
 *   isStudent?: boolean,
 *   recordedBy?: object|null,
 * }} input
 * @returns {Promise<{ payment: object, coversUntil: string, status: string }>}
 */
export async function recordPayment({ memberId, amount, method, planType, isStudent, recordedBy }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Enter the amount received.");
  }
  if (method !== "cash" && method !== "transfer") {
    throw new Error("Choose a payment method.");
  }
  if (planType !== undefined && !PLAN_TYPES.includes(planType)) {
    throw new Error("Choose a plan.");
  }

  const member = await store.members.get(memberId);
  if (!member) {
    throw new Error(`No member found for #${memberId}`);
  }

  const nextPlanType = planType ?? member.planType;
  const planChanged = planType !== undefined && planType !== member.planType;
  const studentChanged =
    isStudent !== undefined && !!isStudent !== !!member.isStudent;

  const existingPayments = await store.payments.where("memberId").equals(memberId).toArray();
  const currentCoversUntil = latestPaymentOf(existingPayments)?.coversUntil ?? null;

  const paidAt = new Date().toISOString();
  const coversUntil = computeCoversUntil(paidAt, nextPlanType, currentCoversUntil);

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

  // Payment row, the member's plan change (if any), and the queue entry all
  // commit together — a payment can never be taken locally and then silently
  // never pushed (sync/outbox.js), and a plan switch can never be recorded
  // without the payment that triggered it.
  const id = await store.transaction(["members", "payments", "outbox"], async (tx) => {
    if (planChanged || studentChanged) {
      await tx.members.update(memberId, {
        ...(planChanged ? { planType } : {}),
        ...(studentChanged ? { isStudent: isStudent ? 1 : 0 } : {}),
      });
    }
    const paymentId = await tx.payments.add(payment);
    // paidAt travels with it: the backend counts coverage from when the member
    // paid, not from whenever this tablet next finds a network (TRD 7).
    await enqueue(tx, "payment", {
      memberId,
      amount: numericAmount,
      method,
      planType: planChanged ? planType : undefined,
      isStudent: studentChanged ? !!isStudent : undefined,
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
