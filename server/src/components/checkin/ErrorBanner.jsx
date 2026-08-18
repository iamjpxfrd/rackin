import { TriangleAlert } from "lucide-react";

// States the problem and the next action, no apology (DESIGN.md voice).
// Stays inline — never blocks staff from immediately trying numpad/search
// again (PRD 4.1 AC3).
export default function ErrorBanner({ message }) {
  return (
    <div className="flex items-center gap-2 rounded-ds-sm border border-rubber-red/30 bg-rubber-red/12 px-4 py-3">
      <TriangleAlert size={20} strokeWidth={1.75} className="shrink-0 text-rubber-red" />
      <p className="font-body text-base text-rubber-red">{message}</p>
    </div>
  );
}
