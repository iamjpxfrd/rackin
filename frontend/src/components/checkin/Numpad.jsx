import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

// The signature component (DESIGN.md "Numpad key"): styled as a physical
// control, not a form input — real press depth, disabled confirm key until
// a valid number is entered.
export default function Numpad({ value, onChange, onSubmit, disabled }) {
  function pressDigit(digit) {
    if (disabled) return;
    onChange((value + digit).slice(0, 6));
  }

  function pressBackspace() {
    if (disabled) return;
    onChange(value.slice(0, -1));
  }

  function pressConfirm() {
    if (disabled || !value) return;
    onSubmit(value);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-16 items-center justify-center rounded-ds-sm border border-steel-300 bg-surface-white px-4 font-numeral text-3xl text-ink-900"
        aria-live="polite"
      >
        {value || <span className="text-steel-300">Member #</span>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === "" ? (
            <div key={`spacer-${i}`} aria-hidden="true" />
          ) : key === "⌫" ? (
            <button
              key="backspace"
              type="button"
              onClick={pressBackspace}
              disabled={disabled}
              aria-label="Backspace"
              className="flex h-18 items-center justify-center rounded-ds-sm border border-steel-300 bg-surface-white text-steel-700 shadow-key-rest transition-[transform,box-shadow] duration-75 ease-out active:translate-y-0.5 active:shadow-key-pressed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
            >
              <Delete size={28} strokeWidth={1.75} />
            </button>
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => pressDigit(key)}
              disabled={disabled}
              className="flex h-18 items-center justify-center rounded-ds-sm border border-steel-300 bg-surface-white font-numeral text-4xl text-ink-900 shadow-key-rest transition-[transform,box-shadow] duration-75 ease-out active:translate-y-0.5 active:shadow-key-pressed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
            >
              {key}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={pressConfirm}
        disabled={disabled || !value}
        className="h-18 w-full rounded-ds-sm bg-signal-yellow font-body text-lg font-bold text-ink-900 shadow-key-rest transition-[transform,box-shadow] duration-75 ease-out active:translate-y-0.5 active:shadow-key-pressed disabled:bg-steel-300 disabled:text-steel-700 disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
      >
        CHECK IN
      </button>
    </div>
  );
}
