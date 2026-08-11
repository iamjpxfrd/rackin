// S5 — New Member (frontend-spec.md §6.5, PRD 4.6).
//
// Registration and first payment are ONE screen with ONE confirm, never two
// steps with a save-and-continue. Field order matches how staff actually
// talk: name → phone → plan → money; the conversation reaches money last.

import { useState } from "react";
import { registerMember } from "../../domain/members.js";
import { computeCoversUntil } from "../../domain/membership.js";
import {
  CURRENCY_SYMBOL,
  PLAN_TYPES,
  formatDate,
  planDuration,
  planLabel,
} from "../../domain/constants.js";
import { ScreenHeader, SectionHeader } from "../ui/Layout.jsx";
import Field from "../ui/Field.jsx";
import ChoiceGroup from "../ui/ChoiceGroup.jsx";
import PressKey from "../ui/PressKey.jsx";
import TransferQr from "../ui/TransferQr.jsx";
import NameField from "./NameField.jsx";
import ErrorBanner from "../checkin/ErrorBanner.jsx";

const PLAN_OPTIONS = PLAN_TYPES.map((value) => ({
  value,
  label: planLabel(value).toUpperCase(),
  // Durations stated at the point of choice, so the flat-30-day rule is
  // legible before staff commit rather than discovered later.
  detail: planDuration(value),
}));

const METHOD_OPTIONS = [
  { value: "cash", label: "CASH" },
  { value: "transfer", label: "TRANSFER" },
];

export default function NewMemberScreen({ nextMemberId, onRegistered }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [planType, setPlanType] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const numericAmount = Number(amount);
  const amountIsValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const canSubmit =
    name.trim() !== "" && planType !== null && amountIsValid && paymentMethod !== null;

  // Live preview: the resulting coverage date, computed by the same domain
  // function that will do the write.
  const coversUntil = planType
    ? computeCoversUntil(new Date().toISOString(), planType)
    : null;

  async function handleSubmit() {
    const errors = {};
    if (!name.trim()) errors.name = "Enter the member's name.";
    if (!amountIsValid) errors.amount = "Enter the amount received.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !canSubmit) return;

    setSaving(true);
    setSaveError(null);
    try {
      const { member } = await registerMember({
        name,
        phone,
        planType,
        amount: numericAmount,
        paymentMethod,
      });
      onRegistered(member);
    } catch (err) {
      // Nothing is half-saved — registerMember is one transaction — so the
      // form keeps its values and staff can retry without re-entry.
      setSaveError(`${err.message} Nothing was saved.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader title="New Member" />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4 pt-2">
        <section className="flex flex-col gap-4">
          <SectionHeader>Member</SectionHeader>
          <NameField
            label="Name"
            value={name}
            onChange={(next) => {
              setName(next);
              if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
            }}
            error={fieldErrors.name}
          />
          <Field
            label="Phone · optional"
            value={phone}
            onChange={setPhone}
            inputMode="tel"
            numeric={false}
          />
          <ChoiceGroup
            label="Plan"
            name="planType"
            options={PLAN_OPTIONS}
            value={planType}
            onChange={setPlanType}
          />
        </section>

        <section className="flex flex-col gap-4">
          <SectionHeader>First payment</SectionHeader>
          <Field
            label="Amount"
            value={amount}
            onChange={(next) => {
              setAmount(next);
              if (fieldErrors.amount) setFieldErrors((e) => ({ ...e, amount: undefined }));
            }}
            error={fieldErrors.amount}
            inputMode="decimal"
            numeric
            prefix={CURRENCY_SYMBOL || undefined}
          />
          <ChoiceGroup
            label="Method"
            name="paymentMethod"
            options={METHOD_OPTIONS}
            value={paymentMethod}
            onChange={setPaymentMethod}
          />
          {paymentMethod === "transfer" && <TransferQr />}
        </section>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-steel-300 bg-chalk-50 p-4">
        {saveError && <ErrorBanner message={saveError} />}

        {/* The assigned number appears BEFORE confirm so staff can start
            writing the physical card while still talking. */}
        <div className="flex items-center justify-between gap-4 rounded-ds-sm border border-steel-300 bg-surface-white px-4 py-3">
          <span className="font-body text-base font-medium text-ink-900">
            Will be member
          </span>
          <span className="flex shrink-0 items-baseline gap-3">
            <span className="font-mono text-base text-ink-900">#{nextMemberId}</span>
            <span className="font-body text-sm text-steel-700">
              {coversUntil ? `covers until ${formatDate(coversUntil)}` : "choose a plan"}
            </span>
          </span>
        </div>

        <PressKey onClick={handleSubmit} disabled={!canSubmit || saving}>
          REGISTER MEMBER
        </PressKey>
      </div>
    </div>
  );
}
