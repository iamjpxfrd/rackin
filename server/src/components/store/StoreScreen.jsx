// Store — new screen; android's own Store tab (cash ledger for gym-side
// income/expenses) has no read endpoint back to server/ yet. Per the
// desktop dashboard design canvas's own annotation: "Store's [dashboard
// scope] was explicitly deferred... Sample data only, not real reported
// figures." So this ships as the canvas's own sample transactions, labeled
// as such — a preview of the shape a real Store screen would take, not a
// live read. Swap in a real fetch once GET /api/store exists.

import { ScreenHeader, Card } from "../ui/Layout.jsx";

const TRANSACTIONS = [
  { date: "Aug 27", item: "Monthly plan — Ana Reyes", type: "income", amount: "+₱1,200" },
  { date: "Aug 27", item: "Protein bar — retail", type: "income", amount: "+₱80" },
  { date: "Aug 26", item: "Equipment maintenance", type: "expense", amount: "−₱2,500" },
  { date: "Aug 26", item: "Weekly plan — Carlo Mendoza", type: "income", amount: "+₱300" },
  { date: "Aug 25", item: "Water bottle — retail", type: "income", amount: "+₱45" },
];

export default function StoreScreen() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ScreenHeader title="Store" meta="Sample Data">
        <div className="flex items-baseline gap-2">
          <span className="font-body text-xs font-bold uppercase tracking-[0.08em] text-text-muted">This Month</span>
          <span className="font-heading text-[22px] text-accent">₱86,400</span>
        </div>
      </ScreenHeader>

      <Card className="min-h-0 flex-1 overflow-auto !p-0">
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr>
              {["Date", "Item", "Type", "Amount"].map((h, i) => (
                <th
                  key={h}
                  className={`border-b border-border bg-page px-5 pb-2.5 pt-2.5 font-heading text-[11px] uppercase tracking-[0.06em] text-text-muted ${
                    i === 3 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRANSACTIONS.map((row, i) => {
              const isIncome = row.type === "income";
              const tone = isIncome ? "text-accent" : "text-danger";
              return (
                <tr key={i} className="h-14 border-b border-hairline last:border-b-0">
                  <td className="px-5 text-text-muted">{row.date}</td>
                  <td className="px-5 font-medium text-text">{row.item}</td>
                  <td className={`px-5 font-heading text-xs font-bold uppercase ${tone}`}>{row.type}</td>
                  <td className={`px-5 text-right font-heading text-[17px] ${tone}`}>{row.amount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
