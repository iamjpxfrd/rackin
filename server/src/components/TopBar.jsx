// Thin top bar per DESIGN.md's layout concept.
//
// The "who's on the desk" attribution control used to live here
// (domain/staff.js, components/staff/OnDeskSheet.jsx). Both are gone:
// attribution is recorded at the point of write, which is now android/'s job
// exclusively ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted
// 2026-08-22). This bar just names the app.

export default function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-steel-300 bg-surface-white px-4">
      <span className="font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-900">
        RackIn
      </span>
    </header>
  );
}
