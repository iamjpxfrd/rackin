// Who is on the desk, and the gym's staff list.
//
// A picker, not a login. There is no password and no attempt at one: on a
// shared front-desk tablet a PIN gets shared within a day, and then every
// record carries a name that may be false — which is worse than none, because
// the owner trusts it precisely because it looked like security
// (domain/staff.js).

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Plus, UserMinus } from "lucide-react";
import Sheet from "../ui/Sheet.jsx";
import Field from "../ui/Field.jsx";
import { addStaff, listStaff, retireStaff, setOnDesk } from "../../domain/staff.js";

export default function OnDeskSheet({ onDesk, onClose }) {
  const staff = useLiveQuery(() => listStaff(), [], []);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setError(null);
    setAdding(true);
    try {
      const person = await addStaff(newName);
      setNewName("");
      // Adding yourself and then having to tap your own name is a step with no
      // decision in it — the first person added is almost always whoever is
      // standing there setting the tablet up.
      if (!onDesk) await setOnDesk(person.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleSelect(staffId) {
    await setOnDesk(staffId);
    onClose();
  }

  return (
    <Sheet
      title="Who's on the desk?"
      subtitle="Check-ins and payments are recorded under this name until it's changed."
      onClose={onClose}
    >
      {staff.length > 0 && (
        <ul className="flex flex-col gap-2">
          {staff.map((person) => {
            const isOnDesk = person.id === onDesk?.id;
            return (
              <li key={person.id} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => handleSelect(person.id)}
                  aria-pressed={isOnDesk}
                  className={`flex h-16 flex-1 items-center justify-between gap-3 rounded-ds-sm px-4 font-body text-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700 ${
                    isOnDesk
                      ? "bg-ink-900 text-surface-white"
                      : "border border-steel-300 bg-surface-white text-steel-700"
                  }`}
                >
                  <span className="truncate">{person.name}</span>
                  {isOnDesk && <Check size={20} strokeWidth={2} className="shrink-0" />}
                </button>
                <button
                  type="button"
                  onClick={() => retireStaff(person.id)}
                  aria-label={`Remove ${person.name} from the staff list`}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-ds-sm border border-steel-300 bg-surface-white text-steel-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
                >
                  <UserMinus size={20} strokeWidth={1.75} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {staff.length === 0 && (
        <p className="font-body text-base text-steel-700">
          No staff added yet. Add the people who work the front desk, so the gym
          can see who recorded each payment.
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-steel-300 pt-5">
        <Field
          label="Add a staff member"
          value={newName}
          onChange={setNewName}
          error={error}
          placeholder="Their name"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="flex h-16 items-center justify-center gap-2 rounded-ds-sm bg-ink-900 font-body text-lg font-semibold text-surface-white disabled:bg-steel-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel-700"
        >
          <Plus size={20} strokeWidth={2} />
          Add to staff list
        </button>
      </div>
    </Sheet>
  );
}
