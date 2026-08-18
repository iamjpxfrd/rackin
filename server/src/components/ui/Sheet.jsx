// Bottom sheet used by Record Payment (frontend-spec.md §6.4).
//
// A sheet rather than a screen: the member's name and status stay visible
// behind it as confirmation of WHO is being paid for, and the controls land
// in thumb reach on a portrait tablet.
//
// Dismiss is ✕, scrim tap, or Esc — never a confirm-discard prompt. Staff
// are mid-conversation; "are you sure you want to leave?" is exactly the
// interruption this product exists to remove.

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Sheet({ title, subtitle, onClose, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-ink-900/40"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex animate-[sheet-in_150ms_ease-out] flex-col gap-5 rounded-t-ds-lg bg-surface-white p-4 pt-6 shadow-card outline-none motion-reduce:animate-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="font-body text-2xl font-bold text-ink-900">{title}</h2>
            {subtitle && (
              <p className="truncate font-body text-sm text-steel-700">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-ds-sm text-steel-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
          >
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>

        {children}
      </div>

      <style>{`
        @keyframes sheet-in {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
