// Small structural pieces shared by every screen (frontend-spec.md §5.3).

/** Screen title row, with an optional trailing count in Mono. */
export function ScreenHeader({ title, meta, children }) {
  return (
    <div className="flex h-16 shrink-0 items-baseline justify-between px-4">
      <h1 className="font-body text-2xl font-bold text-ink-900">{title}</h1>
      {meta && <span className="font-mono text-base text-steel-700">{meta}</span>}
      {children}
    </div>
  );
}

/** Uppercase eyebrow above a section, matching the activity feed's. */
export function SectionHeader({ children, count }) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between px-1">
      <span className="font-body text-[13px] font-semibold uppercase tracking-[0.08em] text-steel-700">
        {children}
      </span>
      {count !== undefined && (
        <span className="font-mono text-sm text-steel-700">{count}</span>
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
    <div className="flex flex-col items-center gap-3 rounded-ds-sm border border-steel-300 bg-surface-white px-6 py-10 text-center">
      <p className="font-body text-lg text-ink-900">{title}</p>
      {hint && <p className="max-w-md font-body text-sm text-steel-700">{hint}</p>}
      {action}
    </div>
  );
}

/** White surface that groups list rows, with hairline dividers between them. */
export function Panel({ children, className = "" }) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-ds-sm border border-steel-300 bg-surface-white ${className}`}
    >
      {children}
    </div>
  );
}
