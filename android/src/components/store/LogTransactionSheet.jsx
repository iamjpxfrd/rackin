// Store's "LOG A TRANSACTION" action (renamed from "Log an expense",
// 2026-08-22) — the one Store flow with no fixed price or item, so unlike a
// quick-sell tile it needs a form: income or expense, what it was for, and
// how much. Built directly from the mockup's dashed button plus the app's
// established Sheet/ChoiceGroup/Field/TakenBy vocabulary — there was no
// transaction-entry artboard to match, only the button that opens it.
//
// Generalized from the original expense-only sheet so staff can also log
// store income that isn't Water/Treadmill/Stair Incline (a walk-in sundry
// sale, say) — the ChoiceGroup at the top picks which, same "no default
// selection" reasoning as every other Plan/Method choice in this app: a
// wrong prefill would silently misrecord which side of the ledger this is.

import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { logTransaction } from "../../domain/store.js";
import { getOnDesk } from "../../domain/staff.js";
import { CURRENCY_SYMBOL } from "../../domain/constants.js";
import Sheet from "../ui/Sheet.jsx";
import Field from "../ui/Field.jsx";
import ChoiceGroup from "../ui/ChoiceGroup.jsx";
import TakenBy from "../staff/TakenBy.jsx";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import ErrorBanner from "../checkin/ErrorBanner.jsx";
import { colors } from "../../theme/colors.js";

const TYPE_OPTIONS = [
  { value: "income", label: "INCOME" },
  { value: "expense", label: "EXPENSE" },
];

export default function LogTransactionSheet({ onClose, onRecorded }) {
  const [type, setType] = useState(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  // undefined until the lookup lands, never null — see RecordPaymentSheet's
  // header comment for why that distinction matters.
  const [takenBy, setTakenBy] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    getOnDesk().then((person) => {
      if (!cancelled) setTakenBy(person);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const numericAmount = Number(amount);
  const amountIsValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const canSubmit = type !== null && description.trim().length > 0 && amountIsValid && !saving;
  const disabled = !canSubmit;

  async function handleSubmit() {
    if (!canSubmit) {
      if (!amountIsValid) setError("Enter the amount.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await logTransaction({ type, description, amount: numericAmount, recordedBy: takenBy });
      onRecorded(type);
    } catch (err) {
      setSaveError(`${err.message} Nothing was saved.`);
    } finally {
      setSaving(false);
    }
  }

  const buttonColor = disabled ? colors.border : type === "expense" ? colors.danger : colors.accent;

  return (
    <Sheet title="Log a transaction" onClose={onClose}>
      {saveError && <ErrorBanner message={saveError} />}

      <ChoiceGroup label="Type" options={TYPE_OPTIONS} value={type} onChange={setType} />

      <Field
        label="What was it for"
        value={description}
        onChange={setDescription}
        placeholder={type === "income" ? "e.g. Old equipment sold" : "e.g. Drinking water restock"}
      />

      <Field
        label="Amount"
        value={amount}
        onChange={(next) => {
          setAmount(next);
          if (error) setError(null);
        }}
        error={error}
        inputMode="decimal"
        numeric
        prefix={CURRENCY_SYMBOL || undefined}
      />

      <TakenBy value={takenBy} onChange={setTakenBy} />

      <Pressable onPress={handleSubmit} disabled={disabled} accessibilityRole="button">
        <DiagonalCut
          color={buttonColor}
          style={{ height: 62, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            className="font-heading text-lg tracking-wider"
            style={{ color: disabled ? colors.textMuted : colors.page }}
          >
            {type === "income" ? "LOG INCOME" : type === "expense" ? "LOG EXPENSE" : "LOG TRANSACTION"}
          </Text>
        </DiagonalCut>
      </Pressable>
    </Sheet>
  );
}
