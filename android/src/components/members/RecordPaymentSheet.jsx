// S4 — Record Payment (frontend-spec.md §6.4). Ported from
// server/src/components/members/RecordPaymentSheet.jsx, reskinned to
// Kinetic Court. The live coverage preview (current status → next status)
// is what makes the extend-from-payment-date rule visible BEFORE it's
// committed — the only guard the pilot provides against an early renewal
// quietly shortening someone's coverage.
//
// Unlike NewMemberScreen, the amount here starts prefilled from this
// member's own payment history (getLastPaymentAmount), never from
// pricing.js's suggested-price table — a renewal reflects what THEY
// actually pay, which can differ from the current list price, not an
// invented number. The one exception: changing Plan below (e.g. a Session
// drop-in deciding to go Monthly) recomputes the suggested amount, since the
// old plan's last-paid amount is actively wrong for a different plan.
//
// Plan is new here (2026-08-22, following a user request): staff can change
// a member's plan at the point of payment — the natural moment someone
// converts from a one-off Session to an ongoing membership — instead of
// needing a separate "edit member" flow that doesn't exist. recordPayment()
// updates the member's stored plan in the same transaction as the payment.

import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { recordPayment, getLastPaymentAmount } from "../../domain/payments.js";
import { getOnDesk } from "../../domain/staff.js";
import { computeCoversUntil, deriveStatus } from "../../domain/membership.js";
import { suggestedAmount, isPromoActive } from "../../domain/pricing.js";
import {
  CURRENCY_SYMBOL,
  PLAN_TYPES,
  formatDate,
  planDuration,
  planLabel,
} from "../../domain/constants.js";
import Sheet from "../ui/Sheet.jsx";
import Field from "../ui/Field.jsx";
import ChoiceGroup from "../ui/ChoiceGroup.jsx";
import TakenBy from "../staff/TakenBy.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import TransferQr from "../ui/TransferQr.jsx";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import ErrorBanner from "../checkin/ErrorBanner.jsx";
import { colors } from "../../theme/colors.js";

const PLAN_OPTIONS = PLAN_TYPES.map((value) => ({
  value,
  label: planLabel(value).toUpperCase(),
  detail: planDuration(value),
}));

const METHOD_OPTIONS = [
  { value: "cash", label: "CASH" },
  { value: "transfer", label: "TRANSFER" },
];

export default function RecordPaymentSheet({ profile, onClose, onRecorded }) {
  const { member, status, isExpiringSoon } = profile;

  // Pre-selected to the member's current plan — a renewal, not a fresh
  // choice, so there's a correct default here unlike NewMemberScreen's
  // deliberately-null Plan/Membership-type fields.
  const [planType, setPlanType] = useState(member.planType);
  const [amount, setAmount] = useState("");
  // No default method: cash and transfer are equally likely, and a wrong
  // prefill is a silently wrong record.
  const [method, setMethod] = useState(null);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  // Device-wide setting (pricing.js) — only read here, never toggled; the
  // switch itself lives on New Member registration.
  const [promoActive, setPromoActiveState] = useState(false);
  // Defaults to the shift and is confirmed via TakenBy, so a handover
  // nobody remembered to record surfaces here rather than in a month-end
  // discrepancy. `undefined` until the lookup lands, never null: null is a
  // real answer (nobody signed in) that the domain preserves as-is.
  const [takenBy, setTakenBy] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    getLastPaymentAmount(member.id).then((last) => {
      if (!cancelled && last !== null) setAmount(String(last));
    });
    getOnDesk().then((person) => {
      if (!cancelled) setTakenBy(person);
    });
    isPromoActive().then((active) => {
      if (!cancelled) setPromoActiveState(active);
    });
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  // Changing Plan away from what the member is currently on suggests a fresh
  // amount from pricing.js (using their stored membership type) — the old
  // plan's last-paid amount would otherwise silently carry over as the
  // wrong number for the new plan. Switching back to the original plan
  // leaves whatever amount is already typed alone.
  function selectPlan(next) {
    setPlanType(next);
    if (next !== member.planType) {
      const suggested = suggestedAmount(next, { isStudent: !!member.isStudent, promoActive });
      if (suggested !== null) setAmount(String(suggested));
    }
  }

  const numericAmount = Number(amount);
  const amountIsValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const canSubmit = amountIsValid && method !== null && !saving;

  const coversUntil = computeCoversUntil(new Date().toISOString(), planType);
  const nextStatus = deriveStatus({ coversUntil });

  async function handleSubmit() {
    if (!amountIsValid) {
      setError("Enter the amount received.");
      return;
    }
    if (!canSubmit) return;

    setSaving(true);
    setSaveError(null);
    try {
      // Passed explicitly, including when null: an unattributed payment is
      // a truthful record, and refusing to take money because nobody signed
      // in would be the app obstructing the transaction it exists to record.
      await recordPayment({
        memberId: member.id,
        amount: numericAmount,
        method,
        planType,
        recordedBy: takenBy,
      });
      onRecorded();
    } catch (err) {
      // Sheet stays open with values intact — never a toast, the sheet is
      // the context.
      setSaveError(`${err.message} Nothing was saved.`);
    } finally {
      setSaving(false);
    }
  }

  const disabled = !canSubmit;

  return (
    <Sheet
      title="Record payment"
      subtitle={`${member.name} · #${member.id} · ${planLabel(member.planType)}`}
      onClose={onClose}
    >
      {saveError && <ErrorBanner message={saveError} />}

      <ChoiceGroup label="Plan" options={PLAN_OPTIONS} value={planType} onChange={selectPlan} />

      <Field
        label="Amount"
        value={amount}
        onChange={(next) => {
          setAmount(next);
          if (error) setError(null);
        }}
        error={error}
        hint={
          planType === member.planType
            ? "Prefilled from this member's last payment."
            : "Prefilled from the new plan's suggested price."
        }
        inputMode="decimal"
        numeric
        prefix={CURRENCY_SYMBOL || undefined}
      />

      <ChoiceGroup label="Method" options={METHOD_OPTIONS} value={method} onChange={setMethod} />
      {method === "transfer" && <TransferQr />}

      <TakenBy value={takenBy} onChange={setTakenBy} />

      <View className="flex-row items-center gap-4 border border-border bg-page p-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-body-medium text-base text-white">
            Covers until {formatDate(coversUntil)}
          </Text>
          <Text className="font-body text-sm text-muted">
            {planDuration(planType)} from today · {planLabel(planType).toLowerCase()} plan
          </Text>
        </View>
        <View className="shrink-0 flex-row items-center gap-2">
          <StatusBadge status={status} isExpiringSoon={isExpiringSoon} />
          <ArrowRight size={18} strokeWidth={1.75} color={colors.textMuted} />
          <StatusBadge status={nextStatus.status} isExpiringSoon={nextStatus.isExpiringSoon} />
        </View>
      </View>

      <Pressable onPress={handleSubmit} disabled={disabled} accessibilityRole="button">
        <DiagonalCut
          color={disabled ? colors.border : colors.accent}
          style={{ height: 62, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            className="font-heading text-lg tracking-wider"
            style={{ color: disabled ? colors.textMuted : colors.page }}
          >
            RECORD PAYMENT
          </Text>
        </DiagonalCut>
      </Pressable>
    </Sheet>
  );
}
