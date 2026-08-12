// Name entry that completes from names the gym has already registered.
//
// Names repeat at a single gym — shared surnames, families on the same plan —
// and the front desk is typing on a tablet keyboard while talking to someone.
// Completing from the existing roster saves the typing AND spells the name
// the same way every time, which is what lets search find them later.
//
// Suggestions never block: two members may share a name and the member number
// disambiguates (PRODUCT.md). An exact match is surfaced as a note, not an
// error, so staff can see "this name is already registered" and decide.

import { useEffect, useId, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { suggestNames } from "../../domain/members.js";

export default function NameField({ label, value, onChange, error }) {
  const id = useId();
  const errorId = `${id}-error`;
  const listId = `${id}-suggestions`;

  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    suggestNames(value).then((matches) => {
      if (!cancelled) setSuggestions(matches);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const exactMatch = suggestions.find(
    (s) => s.name.toLowerCase() === value.trim().toLowerCase(),
  );
  // Once the field already holds the full name, the list has nothing left to
  // save the typist.
  const visible = !dismissed && suggestions.length > 0 && !exactMatch;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-body text-sm font-medium text-steel-700">
        {label}
      </label>

      <div
        className={`flex h-16 items-center rounded-ds-sm border bg-surface-white px-4 focus-within:outline focus-within:outline-2 focus-within:outline-steel-700 ${
          error ? "border-rubber-red" : "border-steel-300"
        }`}
      >
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            setDismissed(false);
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && visible) {
              e.stopPropagation();
              setDismissed(true);
            }
          }}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : visible ? listId : undefined}
          aria-autocomplete="list"
          className="w-full bg-transparent font-body text-lg font-medium text-ink-900 placeholder:text-steel-300 focus:outline-none"
        />
      </div>

      {visible && (
        <ul
          id={listId}
          className="flex flex-col overflow-hidden rounded-ds-sm border border-steel-300 bg-surface-white"
        >
          {suggestions.map((suggestion) => (
            <li key={suggestion.id} className="border-b border-steel-300 last:border-b-0">
              <button
                type="button"
                onClick={() => {
                  onChange(suggestion.name);
                  setDismissed(true);
                }}
                className="flex h-14 w-full items-center gap-3 px-4 text-left hover:bg-chalk-50 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-steel-700"
              >
                <CornerDownLeft
                  size={16}
                  strokeWidth={1.75}
                  className="shrink-0 text-steel-300"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-body text-lg text-ink-900">
                  {suggestion.name}
                </span>
                <span className="shrink-0 font-mono text-sm text-steel-700">
                  #{suggestion.id}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p id={errorId} aria-live="polite" className="font-body text-sm text-rubber-red">
          {error}
        </p>
      ) : exactMatch ? (
        // Not a blocker — a heads-up that saves a duplicate the staff didn't
        // intend, while still allowing the one they did.
        <p className="font-body text-sm text-steel-700">
          #{exactMatch.id} already uses this name. Registering makes a second member.
        </p>
      ) : null}
    </div>
  );
}
