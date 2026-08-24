// Store — cash ledger (Task 4's Store feature proposal, now built). Matched
// to PhoneStore.dc.html: Income/Expenses stat tiles, a diagonal-cut Cash On
// Hand banner, quick-sell tiles for the fixed item list, a dashed "Log a
// transaction" action, and the transaction list. Totals no longer reset at
// midnight (2026-08-23, reversing that original decision) — they run from
// the last explicit "Close register" (CloseRegisterSheet), or from the very
// first transaction if the register has never been closed.
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

import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Plus, SlidersHorizontal } from "lucide-react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import {
  closeRegister,
  getRegisterClosedAt,
  getRegisterTotals,
  getRegisterTransactions,
  sellItem,
  STORE_ITEMS,
  TIMED_ITEMS,
} from "../../domain/store.js";
import { formatAmount, formatDate, formatTime } from "../../domain/constants.js";
import { SectionHeader } from "../ui/Layout.jsx";
import { DiagonalCut } from "../ui/DiagonalCut.jsx";
import Touchable from "../ui/Touchable.jsx";
import Amount from "../ui/Amount.jsx";
import Sheet from "../ui/Sheet.jsx";
import { showToast } from "../ui/Toast.jsx";
import LogTransactionSheet from "./LogTransactionSheet.jsx";
import TimedSaleSheet from "./TimedSaleSheet.jsx";
import CloseRegisterSheet from "./CloseRegisterSheet.jsx";
import StoreTransactionDetailSheet from "./StoreTransactionDetailSheet.jsx";
import { colors } from "../../theme/colors.js";

// Sort/filter/group-by-date added 2026-08-25, same client-side pattern
// MembersScreen already uses (its own SortPill/FilterPills, not shared —
// see that file's header comment): getRegisterTransactions() stays the
// single source of truth for "everything since the register's period
// start," this just re-sorts/filters/groups what it already returned.
const SORTS = {
  newest: { label: "NEWEST", compare: (a, b) => b.occurredAt.localeCompare(a.occurredAt) },
  oldest: { label: "OLDEST", compare: (a, b) => a.occurredAt.localeCompare(b.occurredAt) },
};

const TYPE_FILTERS = [
  { key: "all", label: "ALL", matches: () => true },
  { key: "income", label: "INCOME", matches: (entry) => entry.type === "income" },
  { key: "expense", label: "EXPENSE", matches: (entry) => entry.type === "expense" },
];

// Quick presets, not a calendar date picker (2026-08-25, explicit choice
// over adding a native date-picker dependency) — "This Week"/"This Month"
// are rolling N-day windows ending today, not calendar-week/month
// boundaries; simpler to reason about and good enough for "roughly how
// recent" filtering.
const DATE_RANGES = [
  { key: "all", label: "ALL TIME" },
  { key: "today", label: "TODAY" },
  { key: "week", label: "THIS WEEK" },
  { key: "month", label: "THIS MONTH" },
];

/** Local midnight `daysAgo` days back, as an ISO string comparable against `occurredAt`. */
function startOfLocalDayAgo(daysAgo) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysAgo);
  return start.toISOString();
}

function dateRangeCutoff(key) {
  if (key === "today") return startOfLocalDayAgo(0);
  if (key === "week") return startOfLocalDayAgo(6);
  if (key === "month") return startOfLocalDayAgo(29);
  return null;
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** "Today"/"Yesterday", falling back to formatDate — same local-day reasoning as checkIn.js's startOfLocalDay. */
function dayLabel(occurredAt) {
  const entryDate = new Date(occurredAt);
  const today = new Date();
  if (isSameLocalDay(entryDate, today)) return "Today";
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameLocalDay(entryDate, yesterday)) return "Yesterday";
  return formatDate(occurredAt);
}

/** A row of equal-width selectable pills — same shape as MembersScreen's FilterPills. */
function FilterPills({ label, options, value, onChange }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-1.5">
      {options.map(({ key, label: optionLabel }) => {
        const selected = value === key;
        return (
          <Touchable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            wrapperClassName="flex-1"
            className={`h-11 min-w-[76px] items-center justify-center px-3 ${
              selected ? "bg-accent" : "border border-border bg-page"
            }`}
          >
            <Text className={`font-heading text-xs ${selected ? "text-page" : "text-muted"}`}>
              {optionLabel}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

/** NEWEST/OLDEST sort toggle pill — same shape as MembersScreen's SortPill. */
function SortPill({ label, selected, onPress }) {
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`h-6 items-center justify-center px-2.5 ${selected ? "bg-accent" : "border border-border"}`}
    >
      <Text className={`font-heading text-[10px] ${selected ? "text-page" : "text-muted"}`}>{label}</Text>
    </Touchable>
  );
}

export default function StoreScreen({ active = true }) {
  const totals = useLiveQuery(() => getRegisterTotals(), [], { income: 0, expenses: 0, cashOnHand: 0 });
  const transactions = useLiveQuery(() => getRegisterTransactions(), [], []);
  const closedAt = useLiveQuery(() => getRegisterClosedAt(), [], null);
  const [selling, setSelling] = useState(null);
  const [loggingTransaction, setLoggingTransaction] = useState(false);
  // The TIMED_ITEMS entry currently open in TimedSaleSheet, or null.
  const [loggingTimedItem, setLoggingTimedItem] = useState(null);
  const [closingRegister, setClosingRegister] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Closes any sheet left open on leaving the tab (2026-08-25 follow-up:
  // "don't save any state after leaving the tab") — this screen stays
  // mounted across tab switches (App.js's tab-persistence fix), so an open
  // LogTransactionSheet/TimedSaleSheet would otherwise still be sitting
  // there, half-filled-in, next time Store is opened. Unmounting a sheet
  // discards its own internal form state along with it. Sort/type/date
  // filter selections are left alone, same as MembersScreen — those read as
  // a chosen view, not something someone was mid-typing.
  useEffect(() => {
    if (!active) {
      setLoggingTransaction(false);
      setLoggingTimedItem(null);
      setClosingRegister(false);
      setSelectedTransaction(null);
      setFilterSheetOpen(false);
    }
  }, [active]);

  const typeMatch = TYPE_FILTERS.find((entry) => entry.key === typeFilter).matches;
  const rangeCutoff = dateRangeCutoff(dateRange);
  const filteredTransactions = transactions.filter(
    (entry) => typeMatch(entry) && (!rangeCutoff || entry.occurredAt >= rangeCutoff),
  );
  // Depends on the pieces that actually determine filteredTransactions'
  // contents, not that fresh-every-render array itself — it's rebuilt from
  // `transactions.filter(...)` above on every call regardless, which would
  // otherwise make this memo pointless.
  const sortedTransactions = useMemo(
    () => [...filteredTransactions].sort(SORTS[sortOrder].compare),
    [transactions, typeFilter, dateRange, sortOrder],
  );
  // Grouped by day, in whatever order sortedTransactions already resolved
  // to — a run of consecutive same-day entries becomes one section, so this
  // reads correctly under either NEWEST or OLDEST without a second sort.
  const groupedTransactions = useMemo(() => {
    const sections = [];
    for (const entry of sortedTransactions) {
      const label = dayLabel(entry.occurredAt);
      const last = sections[sections.length - 1];
      if (last && last.label === label) {
        last.entries.push(entry);
      } else {
        sections.push({ label, entries: [entry] });
      }
    }
    return sections;
  }, [sortedTransactions]);
  const filtersActive = typeFilter !== "all" || dateRange !== "all";

  function handleFilterPress() {
    if (filtersActive) {
      setTypeFilter("all");
      setDateRange("all");
    } else {
      setFilterSheetOpen(true);
    }
  }

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
          <Amount value={totals.income} textClassName="font-heading text-[22px]" color={colors.accent} iconSize={16} />
        </View>
        <View className="h-[68px] flex-1 justify-center gap-0.5 border border-border bg-card px-3.5">
          <Text className="font-body-bold text-[10px] tracking-[0.06em] text-muted">EXPENSES</Text>
          <Amount value={totals.expenses} textClassName="font-heading text-[22px]" color={colors.danger} iconSize={16} />
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
        <Amount
          value={totals.cashOnHand}
          textClassName="font-heading text-xl"
          color={colors.page}
          iconSize={16}
          wrapperClassName="pr-8"
        />
      </DiagonalCut>

      <Touchable
        onPress={() => setClosingRegister(true)}
        className="h-9 flex-row items-center justify-center border border-border bg-card"
      >
        <Text className="font-heading text-[11px] tracking-wide text-muted">CLOSE REGISTER</Text>
      </Touchable>

      <SectionHeader>QUICK SELL</SectionHeader>
      <View className="gap-2">
        {STORE_ITEMS.map((item) => (
          <Touchable
            key={item.key}
            onPress={() => handleSell(item)}
            disabled={selling !== null}
            className="h-[54px] flex-row items-center justify-between border border-border bg-card px-4"
          >
            <Text className="font-body-semibold text-[15px] text-white">{item.label}</Text>
            <Amount value={item.price} textClassName="font-heading text-base" color={colors.accent} />
          </Touchable>
        ))}

        {/* Amount varies with duration, unlike the fixed-price tile above —
            each opens TimedSaleSheet instead of selling instantly. */}
        {TIMED_ITEMS.map((item) => (
          <Touchable
            key={item.key}
            onPress={() => setLoggingTimedItem(item)}
            disabled={selling !== null}
            className="h-[54px] flex-row items-center justify-between border border-border bg-card px-4"
          >
            <Text className="font-body-semibold text-[15px] text-white">{item.label}</Text>
            <Text className="font-body text-sm text-muted">Enter amount</Text>
          </Touchable>
        ))}
      </View>

      <Touchable
        onPress={() => setLoggingTransaction(true)}
        className="h-[54px] flex-row items-center justify-center gap-2 border border-dashed border-border"
      >
        <Plus size={16} strokeWidth={2} color={colors.textMuted} />
        <Text className="font-body-semibold text-sm text-muted">LOG A TRANSACTION</Text>
      </Touchable>

      <View className="flex-1 flex-col gap-2">
        <View className="h-8 flex-row items-center justify-between">
          <Text className="font-heading text-[11px] tracking-[0.1em] text-muted">TRANSACTIONS</Text>
          <View className="flex-row items-center gap-2.5">
            <Text className="font-body text-[11px] text-dim">
              {closedAt ? `Since ${formatDate(closedAt)} · ${formatTime(closedAt)}` : "All transactions"}
            </Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Sort" className="flex-row gap-1.5">
              {Object.entries(SORTS).map(([key, { label }]) => (
                <SortPill key={key} label={label} selected={sortOrder === key} onPress={() => setSortOrder(key)} />
              ))}
            </View>
            <Touchable
              onPress={handleFilterPress}
              accessibilityLabel={filtersActive ? "Reset filters" : "Filter"}
              wrapperClassName="shrink-0"
              className="h-6 w-6 items-center justify-center"
            >
              <SlidersHorizontal
                size={14}
                strokeWidth={1.75}
                color={filtersActive ? colors.accent : colors.textDim}
              />
              {filtersActive && (
                <View
                  style={{
                    position: "absolute",
                    top: -1,
                    right: -1,
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: colors.accent,
                  }}
                />
              )}
            </Touchable>
          </View>
        </View>
        {transactions.length === 0 ? (
          <View className="flex-1 items-center justify-center border border-border bg-card">
            <Text className="text-center font-body text-base text-muted">
              Nothing logged since the register opened.
            </Text>
          </View>
        ) : sortedTransactions.length === 0 ? (
          <View className="flex-1 items-center justify-center border border-border bg-card">
            <Text className="text-center font-body text-base text-muted">
              No transactions match this filter.
            </Text>
          </View>
        ) : (
          <View className="flex-1 border border-border bg-card">
            <ScrollView>
              {groupedTransactions.map((section) => (
                <View key={section.label}>
                  <View className="h-7 justify-center border-b border-hairline bg-page px-3.5">
                    <Text className="font-heading text-[10px] tracking-[0.08em] text-dim">
                      {section.label.toUpperCase()}
                    </Text>
                  </View>
                  {section.entries.map((entry, index) => (
                    <Touchable
                      key={entry.id}
                      onPress={() => setSelectedTransaction(entry)}
                      className={`h-[52px] flex-row items-center gap-2.5 px-3.5 ${
                        index === section.entries.length - 1 ? "" : "border-b border-hairline"
                      }`}
                    >
                      <Text className="w-[62px] font-heading text-[11px] text-muted">
                        {formatTime(entry.occurredAt)}
                      </Text>
                      <Text numberOfLines={1} className="flex-1 font-body text-sm text-white">
                        {entry.description}
                      </Text>
                      {/* No peso icon here, unlike the amounts above — the
                          register list is dense enough that the +/− sign
                          alone reads clearly as income/expense (2026-08-25
                          follow-up: icon+sign together felt redundant on
                          this one screen). */}
                      <Text
                        className="font-heading text-sm"
                        style={{ color: entry.type === "income" ? colors.accent : colors.danger }}
                      >
                        {entry.type === "income" ? "+" : "−"}
                        {formatAmount(entry.amount)}
                      </Text>
                    </Touchable>
                  ))}
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

      {closingRegister && (
        <CloseRegisterSheet
          totals={totals}
          onClose={() => setClosingRegister(false)}
          onConfirm={async () => {
            await closeRegister();
            setClosingRegister(false);
            showToast("Register closed");
          }}
        />
      )}

      {selectedTransaction && (
        <StoreTransactionDetailSheet
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}

      {filterSheetOpen && (
        <Sheet title="Filter transactions" onClose={() => setFilterSheetOpen(false)}>
          <View className="gap-2">
            <SectionHeader>TYPE</SectionHeader>
            <FilterPills
              label="Filter by type"
              options={TYPE_FILTERS}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </View>
          <View className="gap-2">
            <SectionHeader>DATE</SectionHeader>
            <FilterPills
              label="Filter by date"
              options={DATE_RANGES}
              value={dateRange}
              onChange={setDateRange}
            />
          </View>
        </Sheet>
      )}
    </View>
  );
}
