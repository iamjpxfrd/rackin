// Payment detail sheet (Task 6) — Member Profile's payment rows only ever
// showed day/month, amount, method, and covers-to date. `recordedById`/
// `recordedByName` are stamped on every payment (domain/payments.js) but
// were never surfaced anywhere on the tablet. Exact time added alongside it,
// matching the level of detail Store's transaction rows already show
// (StoreScreen.jsx's formatTime on each row) — a payment deserves the same.
//
// Read-only, so this is a plain Sheet with no confirm action — same
// bottom-sheet surface RecordPaymentSheet/CloseRegisterSheet use for
// anything that needs more room than a list row, just without a button.

import { Text, View } from "react-native";
import { PhilippinePeso } from "lucide-react-native";
import { formatAmount, formatDate, formatTime, planLabel } from "../../domain/constants.js";
import Sheet from "../ui/Sheet.jsx";
import { colors } from "../../theme/colors.js";

function DetailRow({ label, value, accentValue = false }) {
  return (
    <View className="flex-row items-center justify-between border-b border-hairline py-3">
      <Text className="font-body text-sm text-muted">{label}</Text>
      <Text
        className={`font-body-semibold text-base ${accentValue ? "text-accent" : "text-white"}`}
      >
        {value}
      </Text>
    </View>
  );
}

export default function PaymentDetailSheet({ payment, member, onClose }) {
  if (!payment) return null;

  return (
    <Sheet
      title={formatAmount(payment.amount)}
      titleIcon={<PhilippinePeso size={18} strokeWidth={2} color={colors.textPrimary} />}
      subtitle={`${member.name} · #${member.id}`}
      onClose={onClose}
    >
      <View>
        <DetailRow label="Date" value={formatDate(payment.paidAt)} />
        <DetailRow label="Time" value={formatTime(payment.paidAt)} />
        <DetailRow label="Method" value={payment.method === "cash" ? "Cash" : "Transfer"} />
        <DetailRow label="Plan" value={planLabel(member.planType)} />
        <DetailRow label="Covers until" value={formatDate(payment.coversUntil)} accentValue />
        {/* The important one for reconciling the till against who was
            actually working — attribution, not authentication, same
            contract as TakenBy.jsx everywhere else this is recorded. */}
        <DetailRow
          label="Taken by"
          value={payment.recordedByName ?? "No one signed in"}
        />
      </View>
    </Sheet>
  );
}
