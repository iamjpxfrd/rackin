// Analytics — new screen; neither the tablet nor the old web prototype had
// one. Per the desktop dashboard design canvas's own annotation: "Analytics
// and Store are exploratory — neither has a backend endpoint yet... Sample
// data only, not real reported figures." So every number here is the
// canvas's own sample data, carried over as-is and labeled as such in the
// UI — a preview of the shape a real Analytics screen would take, not a
// live read. Swap in real fetches once revenue/visit/mix endpoints exist.

import { ScreenHeader, Card, Kpi } from "../ui/Layout.jsx";

const CHECKINS_BY_DAY = [
  { day: "Mon", count: 38 },
  { day: "Tue", count: 44 },
  { day: "Wed", count: 41 },
  { day: "Thu", count: 52 },
  { day: "Fri", count: 61 },
  { day: "Sat", count: 58 },
  { day: "Sun", count: 18 },
];
const MAX_CHECKINS = Math.max(...CHECKINS_BY_DAY.map((d) => d.count));
const PEAK_DAYS = new Set(["Fri", "Sat"]);

const MEMBERSHIP_MIX = [
  { label: "Active", pct: 81, barColor: "var(--color-accent)", chip: false },
  { label: "Expiring", pct: 7, barColor: "var(--color-accent-soft)", chip: true },
  { label: "Expired", pct: 12, barColor: "var(--color-danger)", chip: false },
];

export default function AnalyticsScreen() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ScreenHeader title="Analytics" meta="Last 30 Days · Sample Data" />

      <div className="grid grid-cols-4 gap-5">
        <Kpi label="Total Members" value="128" />
        <Kpi label="Active Members" value="104" tone="accent" />
        <Kpi label="Check-Ins This Week" value="312" />
        <Kpi label="Revenue This Month" value="₱86,400" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.4fr_1fr] gap-6">
        <div className="flex min-h-0 flex-col gap-3">
          <span className="shrink-0 font-body text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
            Check-Ins · Last 7 Days
          </span>
          <Card className="flex flex-1 gap-4">
            {CHECKINS_BY_DAY.map(({ day, count }) => {
              const peak = PEAK_DAYS.has(day);
              return (
                <div key={day} className="flex flex-1 flex-col items-center gap-2">
                  <span className={`font-heading text-sm ${peak ? "text-accent" : "text-text-muted"}`}>
                    {count}
                  </span>
                  {/* The bar's own height is a percentage of THIS flex-1 wrapper,
                      which fills whatever room the card actually has — a fixed
                      px ceiling here would leave dead space above the bars on
                      any viewport taller than the design canvas's fixed frame. */}
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={peak ? "w-full bg-accent" : "w-full bg-border"}
                      style={{ height: `${(count / MAX_CHECKINS) * 100}%` }}
                    />
                  </div>
                  <span className="font-body text-[11px] uppercase text-text-muted">
                    {day}
                  </span>
                </div>
              );
            })}
          </Card>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <span className="shrink-0 font-body text-xs font-bold uppercase tracking-[0.12em] text-text-muted">
            Membership Status
          </span>
          <Card className="flex flex-1 flex-col justify-center gap-5">
            {MEMBERSHIP_MIX.map((row) => (
              <div key={row.label} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  {row.chip ? (
                    <span className="bg-accent px-2 py-0.5 font-heading text-[11px] uppercase text-page">
                      {row.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5" style={{ color: row.barColor }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: row.barColor }} />
                      <span className="font-heading text-[13px] font-bold uppercase">{row.label}</span>
                    </span>
                  )}
                  <span className="font-heading text-base text-text">{row.pct}%</span>
                </div>
                <div className="h-2 bg-border">
                  <div className="h-2" style={{ width: `${row.pct}%`, background: row.barColor }} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
