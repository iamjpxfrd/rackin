import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

const AUTO_DISMISS_MS = 2500;

// The one moment of celebration in an otherwise purely functional app
// (DESIGN.md). Overlay, not a screen transition — staff can check the next
// member in immediately without navigating back (app-flow.md §2).
export default function ConfirmationCard({ member, visitCountThisMonth, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-6"
      onClick={onDismiss}
      role="status"
    >
      <div
        className="w-full max-w-sm animate-[confirmation-in_150ms_ease-out] rounded-ds-lg bg-surface-white p-8 text-center shadow-card motion-reduce:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        <CheckCircle2 size={40} strokeWidth={1.75} className="mx-auto text-turf-green" />
        <p className="mt-4 font-body text-3xl font-bold text-ink-900">Checked in — {member.name}</p>
        <p className="mt-2 font-mono text-base text-steel-700">
          Visit {visitCountThisMonth} this month
        </p>
      </div>
      <style>{`
        @keyframes confirmation-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
