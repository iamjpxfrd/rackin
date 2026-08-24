// Store transaction detail sheet (Task 6 follow-up) — the register's
// transaction list only ever showed time, description, and amount. Same
// pattern as members/PaymentDetailSheet.jsx: exact date+time, and who was
// at the desk (recordedByName) — the actually-new information, already
// stored on a store-native row (domain/store.js's record()) and, since the
// same follow-up, on a payment-folded-in row too (getPeriodPaymentsAsTransactions).
//
// Read-only, so a plain Sheet with no confirm action, same as
// PaymentDetailSheet — this is a lookup, not a form.

import { Text, View } from "react-native";
import { formatAmount, formatDate, formatTime } from "../../domain/constants.js";
import { colors } from "../../theme/colors.js";
import Sheet from "../ui/Sheet.jsx";

function DetailRow({ label, value, valueColor }) {
  return (
    <View className="flex-row items-center justify-between border-b border-hairline py-3">
      <Text className="font-body text-sm text-muted">{label}</Text>
      <Text
        className="font-body-semibold text-base"
        style={valueColor ? { color: valueColor } : { color: colors.textPrimary }}
      >
        {value}
      </Text>
    </View>
  );
}

const METHOD_LABEL = { cash: "Cash", transfer: "Transfer" };
const SOURCE_LABEL = { store: "Store sale/expense", payment: "Membership payment" };

export default function StoreTransactionDetailSheet({ transaction, onClose }) {
  if (!transaction) return null;

  const signedAmount = `${transaction.type === "income" ? "+" : "−"}${formatAmount(transaction.amount)}`;

  return (
    <Sheet
      title={signedAmount}
      subtitle={transaction.description}
      onClose={onClose}
    >
      <View>
        <DetailRow label="Date" value={formatDate(transaction.occurredAt)} />
        <DetailRow label="Time" value={formatTime(transaction.occurredAt)} />
        <DetailRow
          label="Type"
          value={transaction.type === "income" ? "Income" : "Expense"}
          valueColor={transaction.type === "income" ? colors.accent : colors.danger}
        />
        {transaction.method && (
          <DetailRow label="Method" value={METHOD_LABEL[transaction.method] ?? transaction.method} />
        )}
        <DetailRow label="Source" value={SOURCE_LABEL[transaction.source] ?? transaction.source} />
        {/* The important one for reconciling the till against who was
            actually working — attribution, not authentication, same
            contract as TakenBy.jsx everywhere else this is recorded. */}
        <DetailRow label="Taken by" value={transaction.recordedByName ?? "No one signed in"} />
      </View>
    </Sheet>
  );
}
