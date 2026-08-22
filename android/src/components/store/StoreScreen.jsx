// Store — daily cash ledger (Task 4's Store feature proposal, now built).
// Matched to PhoneStore.dc.html: Income/Expenses stat tiles, a diagonal-cut
// Cash On Hand banner, quick-sell tiles for the fixed item list, a dashed
// "Log an expense" action, and today's transaction list. Cash On Hand resets
// daily (product decision, 2026-08-22) — everything here is scoped to today,
// same as Check-In's Today's Present.
//
// Kept as its own ledger, deliberately not folded into membership Payments
// totals (same decision) — Store's Income is store-only.

import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import {
  getTodayTotals,
  getTodayTransactions,
  sellItem,
  STORE_ITEMS,
  TREADMILL_ITEM,
} from "../../domain/store.js";
import { formatAmount, formatTime } from "../../domain/constants.js";
import { SectionHeader, Panel } from "../ui/Layout.jsx";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import { showToast } from "../ui/Toast.jsx";
import LogExpenseSheet from "./LogExpenseSheet.jsx";
import TreadmillSaleSheet from "./TreadmillSaleSheet.jsx";
import { colors } from "../../theme/colors.js";

export default function StoreScreen() {
  const totals = useLiveQuery(() => getTodayTotals(), [], { income: 0, expenses: 0, cashOnHand: 0 });
  const transactions = useLiveQuery(() => getTodayTransactions(), [], []);
  const [selling, setSelling] = useState(null);
  const [loggingExpense, setLoggingExpense] = useState(false);
  const [sellingTreadmill, setSellingTreadmill] = useState(false);

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
    <ScrollView className="flex-1 bg-page" contentContainerClassName="gap-3 p-4">
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
        style={{ height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}
      >
        <Text className="font-body-bold text-xs tracking-[0.03em]" style={{ color: colors.page }}>
          CASH ON HAND
        </Text>
        <Text className="font-heading text-xl" style={{ color: colors.page }}>
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

        {/* Amount varies with duration, unlike the fixed-price tiles above —
            this opens TreadmillSaleSheet instead of selling instantly. */}
        <Pressable
          onPress={() => setSellingTreadmill(true)}
          disabled={selling !== null}
          accessibilityRole="button"
          className="h-[54px] flex-row items-center justify-between border border-border bg-card px-4"
        >
          <Text className="font-body-semibold text-[15px] text-white">{TREADMILL_ITEM.label}</Text>
          <Text className="font-body text-sm text-muted">Enter amount</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setLoggingExpense(true)}
        accessibilityRole="button"
        className="h-[54px] flex-row items-center justify-center gap-2 border border-dashed border-border"
      >
        <Plus size={16} strokeWidth={2} color={colors.textMuted} />
        <Text className="font-body-semibold text-sm text-muted">LOG AN EXPENSE</Text>
      </Pressable>

      <SectionHeader>TODAY'S TRANSACTIONS</SectionHeader>
      {transactions.length === 0 ? (
        <Text className="px-4 py-6 text-center font-body text-base text-muted">
          Nothing logged yet today.
        </Text>
      ) : (
        <Panel>
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
        </Panel>
      )}

      {loggingExpense && (
        <LogExpenseSheet
          onClose={() => setLoggingExpense(false)}
          onRecorded={() => {
            setLoggingExpense(false);
            showToast("Expense logged");
          }}
        />
      )}

      {sellingTreadmill && (
        <TreadmillSaleSheet
          onClose={() => setSellingTreadmill(false)}
          onRecorded={() => {
            setSellingTreadmill(false);
            showToast("Treadmill sale recorded");
          }}
        />
      )}
    </ScrollView>
  );
}
