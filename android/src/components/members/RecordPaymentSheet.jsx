// S4 — Record Payment (frontend-spec.md §6.4). Ported from
// server/src/components/members/RecordPaymentSheet.jsx, reskinned to
// Kinetic Court. The live coverage preview (current status → next status)
// is what makes the extend-from-payment-date rule visible BEFORE it's
// committed — the only guard the pilot provides against an early renewal
// quietly shortening someone's coverage.
//
// Unlike NewMemberScreen, the amount here is prefilled from this member's
// own payment history (getLastPaymentAmount), never from pricing.js's
// suggested-price table — a renewal reflects what THEY actually pay, which
// can differ from the current list price, not an invented number.

import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { recordPayment, getLastPaymentAmount } from "../../domain/payments.js";
import { getOnDesk } from "../../domain/staff.js";
import { computeCoversUntil, deriveStatus } from "../../domain/membership.js";
import { CURRENCY_SYMBOL, formatDate, planDuration, planLabel } from "../../domain/constants.js";
import Sheet from "../ui/Sheet.jsx";
import Field from "../ui/Field.jsx";
import ChoiceGroup from "../ui/ChoiceGroup.jsx";
import TakenBy from "../staff/TakenBy.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import TransferQr from "../ui/TransferQr.jsx";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import ErrorBanner from "../checkin/ErrorBanner.jsx";
import { colors } from "../../theme/colors.js";

const METHOD_OPTIONS = [
  { value: "cash", label: "CASH" },
  { value: "transfer", label: "TRANSFER" },
];

export default function RecordPaymentSheet({ profile, onClose, onRecorded }) {
  const { member, status, isExpiringSoon } = profile;

  const [amount, setAmount] = useState("");
  // No default method: cash and transfer are equally likely, and a wrong
  // prefill is a silently wrong record.
  const [method, setMethod] = useState(null);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
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
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  const numericAmount = Number(amount);
  const amountIsValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const canSubmit = amountIsValid && method !== null && !saving;

  const coversUntil = computeCoversUntil(new Date().toISOString(), member.planType);
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

      <Field
        label="Amount"
        value={amount}
        onChange={(next) => {
          setAmount(next);
          if (error) setError(null);
        }}
        error={error}
        hint="Prefilled from this member's last payment."
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
            {planDuration(member.planType)} from today · {planLabel(member.planType).toLowerCase()} plan
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
