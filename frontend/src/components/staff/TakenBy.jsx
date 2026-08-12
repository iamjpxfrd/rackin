// Who is taking this money (frontend-spec.md §6.4).
//
// The one place attribution is confirmed rather than assumed. A check-in takes
// the shift default silently because a misattributed visit is trivia; a payment
// asks, because an unattributed cash payment is the question nobody can answer
// afterwards when the day's takings do not reconcile.
//
// Correcting it also moves the shift. If Ben is taking the money, Ben is on the
// desk — that is what the correction means, and re-deriving it from a handover
// nobody recorded is the whole point.

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { UserRound } from "lucide-react";
import { listStaff, setOnDesk } from "../../domain/staff.js";

export default function TakenBy({ value, onChange }) {
  const staff = useLiveQuery(() => listStaff(), [], []);
  const [choosing, setChoosing] = useState(false);

  const others = staff.filter((person) => person.id !== value?.id);

  async function choose(person) {
    onChange(person);
    // The correction is also a handover: record it once rather than making
    // staff re-correct on every payment for the rest of the shift.
    await setOnDesk(person.id);
    setChoosing(false);
  }

  if (staff.length === 0) {
    return (
      <div className="rounded-ds-sm bg-chalk-50 p-4">
        <p className="font-body text-sm text-steel-700">
          No staff list yet — this payment will be recorded without a name. Add
          staff from the top bar to record who takes payments.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-ds-sm bg-chalk-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <UserRound size={18} strokeWidth={1.75} className="shrink-0 text-steel-700" />
          <span className="truncate font-body text-base text-steel-700">
            Taken by{" "}
            <span className="font-semibold text-ink-900">
              {value ? value.name : "nobody yet"}
            </span>
          </span>
        </span>

        {!choosing && others.length > 0 && (
          <button
            type="button"
            onClick={() => setChoosing(true)}
            className="h-10 shrink-0 rounded-ds-sm border border-steel-300 bg-surface-white px-3 font-body text-sm font-semibold text-steel-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
          >
            {value ? "Not me" : "Choose"}
          </button>
        )}
      </div>

      {choosing && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Taken by">
          {staff.map((person) => (
            <button
              key={person.id}
              type="button"
              role="radio"
              aria-checked={person.id === value?.id}
              onClick={() => choose(person)}
              className={`h-12 flex-1 basis-28 rounded-ds-sm px-3 font-body text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700 ${
                person.id === value?.id
                  ? "bg-ink-900 text-surface-white"
                  : "border border-steel-300 bg-surface-white text-steel-700"
              }`}
            >
              {person.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
