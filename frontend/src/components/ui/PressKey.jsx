// The primary action control, extracted from the Numpad's confirm key so
// the mechanical press is identical everywhere it appears — it's a brand
// signature, not a button style (DESIGN.md "Numpad key").
//
// Disabled reads as steel-300 with no shadow: the same "not ready yet"
// grammar staff already learned on the Check-In screen.

export default function PressKey({ children, onClick, disabled = false, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="h-18 w-full rounded-ds-sm bg-signal-yellow font-body text-lg font-bold tracking-[0.04em] text-ink-900 shadow-key-rest transition-[transform,box-shadow] duration-75 ease-out active:translate-y-0.5 active:shadow-key-pressed disabled:translate-y-0 disabled:bg-steel-300 disabled:text-steel-700 disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
    >
      {children}
    </button>
  );
}

/** Secondary action: same size and press target, no "press this" yellow. */
export function GhostKey({ children, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="h-18 rounded-ds-sm border border-steel-300 bg-surface-white px-6 font-body text-lg font-semibold text-steel-700 transition-colors hover:bg-chalk-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
    >
      {children}
    </button>
  );
}
