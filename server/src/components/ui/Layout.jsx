// Small structural pieces shared by every screen. Kinetic Court dark theme —
// see [[Decisions/Web Becomes a Read-Only Dashboard]] for why server/ reads
// rather than writes, and the desktop dashboard design canvas for the
// layout language these implement (cards/grids in place of the tablet's
// single-column stacked screens).

/** Screen title row — title and an optional meta count share one baseline,
 * per the desktop dashboard design canvas ("Check-In · 18 TODAY" etc.). */
export function ScreenHeader({ title, meta, children }) {
  return (
    <div className="flex shrink-0 items-center justify-between">
      <div className="flex items-baseline gap-3.5">
        <h1 className="font-body text-[22px] font-extrabold text-text">{title}</h1>
        {meta && <span className="font-heading text-[13px] uppercase text-text-muted">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

/** Uppercase eyebrow above a section, matching a card's own title treatment. */
export function SectionHeader({ children, count }) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between">
      <span className="font-heading text-[11px] uppercase tracking-[0.08em] text-text-muted">
        {children}
      </span>
      {count !== undefined && (
        <span className="font-mono text-sm text-text-muted">{count}</span>
      )}
    </div>
  );
}

/**
 * Zero-result panel. One sentence, optionally one action — no illustration,
 * no apology (DESIGN.md voice).
 */
export function EmptyState({ title, hint, action }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-border bg-surface px-6 py-10 text-center">
      <p className="font-body text-base text-text">{title}</p>
      {hint && <p className="max-w-md font-body text-sm text-text-muted">{hint}</p>}
      {action}
    </div>
  );
}

/** Dark surface that groups list rows, with hairline dividers between them. */
export function Panel({ children, className = "" }) {
  return (
    <div className={`flex flex-col overflow-hidden border border-border bg-surface ${className}`}>
      {children}
    </div>
  );
}

/** A titled card — the base unit of every desktop grid layout. */
export function Card({ title, action, children, className = "" }) {
  return (
    <div className={`border border-border bg-surface p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <p className="font-heading text-[13px] uppercase tracking-[0.08em] text-text-muted">
              {title}
            </p>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** A single stat, styled for the KPI row atop Home/Analytics. */
export function Kpi({ label, value, tone = "default" }) {
  const toneClass = tone === "accent" ? "text-accent" : tone === "warn" ? "text-warning" : "text-text";
  return (
    <div className="border border-border bg-surface p-5">
      <p className="font-heading text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <div className={`mt-2.5 font-body text-3xl font-bold leading-none ${toneClass}`}>{value}</div>
    </div>
  );
}
