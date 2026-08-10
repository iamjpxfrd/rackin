// Thin top bar per DESIGN.md's layout concept. No staff accounts exist in
// the pilot (PRD non-goals: no login) — this is a static label, not an
// identity control.
export default function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-steel-300 bg-surface-white px-4">
      <span className="font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-900">
        RackIn
      </span>
      <span className="font-body text-sm text-steel-700">Your Gym Name</span>
    </header>
  );
}
