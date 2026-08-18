// Labeled input (DESIGN.md "Inputs / Fields"). Every input has a real
// <label>; errors are linked with aria-describedby and announced politely,
// never raised as a modal that interrupts staff mid-conversation.

import { useId } from "react";

export default function Field({
  label,
  value,
  onChange,
  error,
  hint,
  prefix,
  inputMode = "text",
  autoComplete = "off",
  numeric = false,
  placeholder,
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-body text-sm font-medium text-steel-700">
        {label}
      </label>

      <div
        className={`flex h-16 items-center gap-2 rounded-ds-sm border bg-surface-white px-4 focus-within:outline focus-within:outline-2 focus-within:outline-steel-700 ${
          error ? "border-rubber-red" : "border-steel-300"
        }`}
      >
        {prefix && (
          <span className="shrink-0 font-mono text-lg text-steel-700">{prefix}</span>
        )}
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full bg-transparent text-ink-900 placeholder:text-steel-300 focus:outline-none ${
            numeric
              ? "font-numeral text-2xl"
              : "font-body text-lg font-medium"
          }`}
        />
      </div>

      {error ? (
        <p id={errorId} aria-live="polite" className="font-body text-sm text-rubber-red">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="font-body text-sm text-steel-700">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
