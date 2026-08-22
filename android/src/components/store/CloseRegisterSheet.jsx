// Confirms closing out the register (Store's Income/Expenses/Cash On Hand
// no longer reset at midnight — 2026-08-23 — they run until this action is
// taken). A Sheet + accent PressableDiagonalCut confirm, not ConfirmDialog:
// that component is deliberately danger-only (a destructive-action pattern,
// trash icon), and closing the register isn't destructive — nothing is
// deleted, this only moves the counting boundary forward. Shows the current
// totals so staff can sanity-check the numbers before starting a new period.

import { Text, View } from "react-native";
import Sheet from "../ui/Sheet.jsx";
import { PressableDiagonalCut } from "../ui/DiagonalCut.jsx";
import { formatAmount } from "../../domain/constants.js";
import { colors } from "../../theme/colors.js";

function TotalRow({ label, value, color }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-body text-sm text-muted">{label}</Text>
      <Text className="font-heading text-base" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}

export default function CloseRegisterSheet({ totals, onConfirm, onClose }) {
  return (
    <Sheet
      title="Close register?"
      subtitle="Income, Expenses, and Cash On Hand start counting fresh from now."
      onClose={onClose}
    >
      <View className="gap-2.5 border border-border bg-page p-4">
        <TotalRow label="Income" value={formatAmount(totals.income)} color={colors.accent} />
        <TotalRow label="Expenses" value={formatAmount(totals.expenses)} color={colors.danger} />
        <TotalRow
          label="Cash on hand"
          value={formatAmount(totals.cashOnHand)}
          color={colors.textPrimary}
        />
      </View>

      <Text className="font-body text-sm text-muted">
        Nothing is deleted — every transaction stays in the log. This only marks a new
        starting point for the totals above.
      </Text>

      <PressableDiagonalCut
        onPress={onConfirm}
        color={colors.accent}
        style={{ height: 62, alignItems: "center", justifyContent: "center" }}
      >
        <Text className="font-heading text-lg tracking-wider" style={{ color: colors.page }}>
          CLOSE REGISTER
        </Text>
      </PressableDiagonalCut>
    </Sheet>
  );
}
