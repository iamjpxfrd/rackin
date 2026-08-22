// Store's Treadmill and Stair Incline quick-sells aren't one-tap like Water
// (StoreScreen.jsx) — a session can run longer than 30 minutes, so the price
// varies. Tapping either tile opens this instead: an amount field prefilled
// with the item's confirmed (or placeholder) 30-min rate, editable for any
// other duration. Shared between both items rather than a dedicated sheet
// each, since the only difference between them is which item/amount to log.

import { useState } from "react";
import { Pressable, Text } from "react-native";
import { sellTimedItem } from "../../domain/store.js";
import { CURRENCY_SYMBOL, formatAmount } from "../../domain/constants.js";
import Sheet from "../ui/Sheet.jsx";
import Field from "../ui/Field.jsx";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import ErrorBanner from "../checkin/ErrorBanner.jsx";
import { colors } from "../../theme/colors.js";

export default function TimedSaleSheet({ item, onClose, onRecorded }) {
  const [amount, setAmount] = useState(String(item.suggestedAmount));
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const numericAmount = Number(amount);
  const amountIsValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const canSubmit = amountIsValid && !saving;
  const disabled = !canSubmit;

  async function handleSubmit() {
    if (!canSubmit) {
      if (!amountIsValid) setError("Enter the amount.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await sellTimedItem(item.key, numericAmount);
      onRecorded();
    } catch (err) {
      setSaveError(`${err.message} Nothing was saved.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title={`Log ${item.label.toLowerCase()} time`} onClose={onClose}>
      {saveError && <ErrorBanner message={saveError} />}

      <Field
        label="Amount"
        value={amount}
        onChange={(next) => {
          setAmount(next);
          if (error) setError(null);
        }}
        error={error}
        hint={`30-min is ${formatAmount(item.suggestedAmount)} — edit for a different duration.`}
        inputMode="decimal"
        numeric
        prefix={CURRENCY_SYMBOL || undefined}
      />

      <Pressable onPress={handleSubmit} disabled={disabled} accessibilityRole="button">
        <DiagonalCut
          color={disabled ? colors.border : colors.accent}
          style={{ height: 62, alignItems: "center", justifyContent: "center" }}
        >
          <Text
            className="font-heading text-lg tracking-wider"
            style={{ color: disabled ? colors.textMuted : colors.page }}
          >
            LOG {item.label.toUpperCase()}
          </Text>
        </DiagonalCut>
      </Pressable>
    </Sheet>
  );
}
