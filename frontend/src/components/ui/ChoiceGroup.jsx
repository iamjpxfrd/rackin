// Two-option segmented control for plan and payment method.
// No pill shapes anywhere in this system (DESIGN.md "Shapes"), and no
// default selection where a wrong prefill would be a silently wrong record.

export default function ChoiceGroup({ label, options, value, onChange, name }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="font-body text-sm font-medium text-steel-700">{label}</legend>
      {/* Wraps rather than squashing: three options fit across a portrait
          tablet, but the basis keeps a label like MONTHLY from being crushed
          on anything narrower. */}
      <div
        className="flex flex-wrap items-stretch gap-3"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              name={name}
              onClick={() => onChange(option.value)}
              className={`flex h-16 flex-1 basis-32 flex-col items-center justify-center gap-0.5 rounded-ds-sm font-body text-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700 ${
                selected
                  ? "bg-ink-900 text-surface-white"
                  : "border border-steel-300 bg-surface-white text-steel-700"
              }`}
            >
              {option.label}
              {option.detail && (
                <span
                  className={`font-body text-[13px] font-normal ${
                    selected ? "text-steel-300" : "text-steel-700"
                  }`}
                >
                  {option.detail}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
