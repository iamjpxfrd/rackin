// Store — daily cash ledger (Task 4's Store feature proposal, now built).
// Matched to PhoneStore.dc.html: Income/Expenses stat tiles, a diagonal-cut
// Cash On Hand banner, quick-sell tiles for the fixed item list, a dashed
// "Log a transaction" action, and today's transaction list. Cash On Hand
// resets daily (product decision, 2026-08-22) — everything here is scoped
// to today, same as Check-In's Today's Present.
//
// The dashed button (renamed from "Log an expense", 2026-08-22) now opens
// LogTransactionSheet, which lets staff pick Income or Expense — the one
// way to log store income beyond Water/Treadmill/Stair Incline (a walk-in
// sundry sale, say), not just expenses.
//
// Layout matches CheckInScreen/ActivityFeed's fixed-screen pattern: the root
// is a plain View (not a ScrollView), so its total height is capped at the
// screen instead of growing with content. Everything above the transaction
// list keeps its natural height; the list itself is the one flex-1 section,
// with its own internal ScrollView — only that list scrolls, the stat
// tiles/Cash On Hand/Quick Sell/Log Expense controls stay fixed in place.

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import {
  getTodayTotals,
  getTodayTransactions,
  sellItem,
  STORE_ITEMS,
  TIMED_ITEMS,
} from "../../domain/store.js";
import { formatAmount, formatTime } from "../../domain/constants.js";
import { SectionHeader } from "../ui/Layout.jsx";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import { showToast } from "../ui/Toast.jsx";
import LogTransactionSheet from "./LogTransactionSheet.jsx";
import TimedSaleSheet from "./TimedSaleSheet.jsx";
import { colors } from "../../theme/colors.js";

export default function StoreScreen() {
  const totals = useLiveQuery(() => getTodayTotals(), [], { income: 0, expenses: 0, cashOnHand: 0 });
  const transactions = useLiveQuery(() => getTodayTransactions(), [], []);
  const [selling, setSelling] = useState(null);
  const [loggingTransaction, setLoggingTransaction] = useState(false);
  // The TIMED_ITEMS entry currently open in TimedSaleSheet, or null.
  const [loggingTimedItem, setLoggingTimedItem] = useState(null);

  async function handleSell(item) {
    setSelling(item.key);
    try {
      await sellItem(item.key);
      showToast(`${item.label} sold — +${formatAmount(item.price)}`);
    } catch (err) {
      showToast(err.message, "warning");
    } finally {
      setSelling(null);
    }
  }

  return (
    <View className="flex-1 flex-col gap-3 bg-page p-4">
      <View className="flex-row gap-2">
        <View className="h-[68px] flex-1 justify-center gap-0.5 border border-border bg-card px-3.5">
          <Text className="font-body-bold text-[10px] tracking-[0.06em] text-muted">INCOME</Text>
          <Text className="font-heading text-[22px] text-accent">{formatAmount(totals.income)}</Text>
        </View>
        <View className="h-[68px] flex-1 justify-center gap-0.5 border border-border bg-card px-3.5">
          <Text className="font-body-bold text-[10px] tracking-[0.06em] text-muted">EXPENSES</Text>
          <Text className="font-heading text-[22px]" style={{ color: colors.danger }}>
            {formatAmount(totals.expenses)}
          </Text>
        </View>
      </View>

      <DiagonalCut
        color={colors.accent}
        cutPercent={95}
        style={{ height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <Text
          className="font-body-bold text-xs tracking-[0.03em]"
          style={{ color: colors.page, paddingLeft: 16 }}
        >
          CASH ON HAND
        </Text>
        {/* The cut only eats into the right edge (DiagonalCut.jsx's polygon
            narrows toward the bottom-right, not the left) — padding on the
            text itself (not the row) keeps the amount clear of it instead of
            tucking under the diagonal, which was clipping the last digit. */}
        <Text className="font-heading text-xl" style={{ color: colors.page, paddingRight: 32 }}>
          {formatAmount(totals.cashOnHand)}
        </Text>
      </DiagonalCut>

      <SectionHeader>QUICK SELL</SectionHeader>
      <View className="gap-2">
        {STORE_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => handleSell(item)}
            disabled={selling !== null}
            accessibilityRole="button"
            className="h-[54px] flex-row items-center justify-between border border-border bg-card px-4"
          >
            <Text className="font-body-semibold text-[15px] text-white">{item.label}</Text>
            <Text className="font-heading text-base text-accent">+{formatAmount(item.price)}</Text>
          </Pressable>
        ))}

        {/* Amount varies with duration, unlike the fixed-price tile above —
            each opens TimedSaleSheet instead of selling instantly. */}
        {TIMED_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setLoggingTimedItem(item)}
            disabled={selling !== null}
            accessibilityRole="button"
            className="h-[54px] flex-row items-center justify-between border border-border bg-card px-4"
          >
            <Text className="font-body-semibold text-[15px] text-white">{item.label}</Text>
            <Text className="font-body text-sm text-muted">Enter amount</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => setLoggingTransaction(true)}
        accessibilityRole="button"
        className="h-[54px] flex-row items-center justify-center gap-2 border border-dashed border-border"
      >
        <Plus size={16} strokeWidth={2} color={colors.textMuted} />
        <Text className="font-body-semibold text-sm text-muted">LOG A TRANSACTION</Text>
      </Pressable>

      <View className="flex-1 flex-col gap-2">
        <SectionHeader>TODAY'S TRANSACTIONS</SectionHeader>
        {transactions.length === 0 ? (
          <View className="flex-1 items-center justify-center border border-border bg-card">
            <Text className="text-center font-body text-base text-muted">
              Nothing logged yet today.
            </Text>
          </View>
        ) : (
          <View className="flex-1 border border-border bg-card">
            <ScrollView>
              {transactions.map((entry, index) => (
                <View
                  key={entry.id}
                  className={`h-[52px] flex-row items-center gap-2.5 px-3.5 ${
                    index === transactions.length - 1 ? "" : "border-b border-hairline"
                  }`}
                >
                  <Text className="w-[62px] font-heading text-[11px] text-muted">
                    {formatTime(entry.occurredAt)}
                  </Text>
                  <Text numberOfLines={1} className="flex-1 font-body text-sm text-white">
                    {entry.description}
                  </Text>
                  <Text
                    className="font-heading text-sm"
                    style={{ color: entry.type === "income" ? colors.accent : colors.danger }}
                  >
                    {entry.type === "income" ? "+" : "−"}
                    {formatAmount(entry.amount)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {loggingTransaction && (
        <LogTransactionSheet
          onClose={() => setLoggingTransaction(false)}
          onRecorded={(type) => {
            setLoggingTransaction(false);
            showToast(type === "income" ? "Income logged" : "Expense logged");
          }}
        />
      )}

      {loggingTimedItem && (
        <TimedSaleSheet
          item={loggingTimedItem}
          onClose={() => setLoggingTimedItem(null)}
          onRecorded={() => {
            const { label } = loggingTimedItem;
            setLoggingTimedItem(null);
            showToast(`${label} logged`);
          }}
        />
      )}
    </View>
  );
}
