// S4 — Record Payment (frontend-spec.md §6.4).
//
// The live coverage preview is the sheet's most important element after the
// amount: it states the resulting date, the plan duration applied, and the
// status transition. This is where the extend-from-payment-date rule becomes
// visible BEFORE it is committed — the only guard the pilot provides against
// an early renewal quietly shortening someone's coverage.

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { recordPayment, getLastPaymentAmount } from "../../domain/payments.js";
import { computeCoversUntil, deriveStatus } from "../../domain/membership.js";
import { CURRENCY_SYMBOL, PLAN_DAYS, formatDate } from "../../domain/constants.js";
import Sheet from "../ui/Sheet.jsx";
import Field from "../ui/Field.jsx";
import ChoiceGroup from "../ui/ChoiceGroup.jsx";
import PressKey from "../ui/PressKey.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import ErrorBanner from "../checkin/ErrorBanner.jsx";

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

  useEffect(() => {
    let cancelled = false;
    // Prefilled from this member's own history — never an invented price.
    getLastPaymentAmount(member.id).then((last) => {
      if (!cancelled && last !== null) setAmount(String(last));
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
      await recordPayment({ memberId: member.id, amount: numericAmount, method });
      onRecorded();
    } catch (err) {
      // Sheet stays open with values intact — never a toast, the sheet is
      // the context.
      setSaveError(`${err.message} Nothing was saved.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      title="Record payment"
      subtitle={`${member.name} · #${member.id} · ${
        member.planType === "weekly" ? "Weekly" : "Monthly"
      }`}
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

      <ChoiceGroup
        label="Method"
        name="method"
        options={METHOD_OPTIONS}
        value={method}
        onChange={setMethod}
      />

      <div className="flex items-center gap-4 rounded-ds-sm bg-chalk-50 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-body text-lg font-medium text-ink-900">
            Covers until {formatDate(coversUntil)}
          </span>
          <span className="font-body text-sm text-steel-700">
            {PLAN_DAYS[member.planType]} days from today ·{" "}
            {member.planType === "weekly" ? "weekly" : "monthly"} plan
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={status} isExpiringSoon={isExpiringSoon} />
          <ArrowRight size={18} strokeWidth={1.75} className="text-steel-700" />
          <StatusBadge
            status={nextStatus.status}
            isExpiringSoon={nextStatus.isExpiringSoon}
          />
        </div>
      </div>

      <PressKey onClick={handleSubmit} disabled={!canSubmit}>
        RECORD PAYMENT
      </PressKey>
    </Sheet>
  );
}
