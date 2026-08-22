// Store's "LOG AN EXPENSE" action (PhoneStore.dc.html) — the one Store flow
// with no fixed price, so unlike a quick-sell tile it needs a form: what was
// bought/paid for, and how much. Built directly from the mockup's dashed
// button plus the app's established Sheet/Field/TakenBy vocabulary — there
// was no expense-entry artboard to match, only the button that opens it.

import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { logExpense } from "../../domain/store.js";
import { getOnDesk } from "../../domain/staff.js";
import { CURRENCY_SYMBOL } from "../../domain/constants.js";
import Sheet from "../ui/Sheet.jsx";
import Field from "../ui/Field.jsx";
import TakenBy from "../staff/TakenBy.jsx";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import ErrorBanner from "../checkin/ErrorBanner.jsx";
import { colors } from "../../theme/colors.js";

export default function LogExpenseSheet({ onClose, onRecorded }) {
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
  const canSubmit = description.trim().length > 0 && amountIsValid && !saving;
  const disabled = !canSubmit;

  async function handleSubmit() {
    if (!canSubmit) {
      if (!amountIsValid) setError("Enter the amount paid.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await logExpense({ description, amount: numericAmount, recordedBy: takenBy });
      onRecorded();
    } catch (err) {
      setSaveError(`${err.message} Nothing was saved.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="Log an expense" onClose={onClose}>
      {saveError && <ErrorBanner message={saveError} />}

      <Field
        label="What was it for"
        value={description}
        onChange={setDescription}
        placeholder="e.g. Drinking water restock"
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
          color={disabled ? colors.border : colors.danger}
          style={{ height: 62, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            className="font-heading text-lg tracking-wider"
            style={{ color: disabled ? colors.textMuted : colors.page }}
          >
            LOG EXPENSE
          </Text>
        </DiagonalCut>
      </Pressable>
    </Sheet>
  );
}
