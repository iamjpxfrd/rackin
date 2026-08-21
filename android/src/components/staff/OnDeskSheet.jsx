// Who is on the desk, and the gym's staff list. Ported from
// server/src/components/staff/OnDeskSheet.jsx — logic and copy unchanged,
// DOM elements swapped for RN primitives.

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Check, Plus, UserMinus } from "lucide-react-native";
import Sheet from "../ui/Sheet.jsx";
import Field from "../ui/Field.jsx";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { addStaff, listStaff, retireStaff, setOnDesk } from "../../domain/staff.js";
import { colors } from "../../theme/colors.js";

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
        <View className="flex-col gap-2">
          {staff.map((person) => {
            const isOnDesk = person.id === onDesk?.id;
            return (
              <View key={person.id} className="flex-row items-stretch gap-2">
                <Pressable
                  onPress={() => handleSelect(person.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isOnDesk }}
                  className={`h-16 flex-1 flex-row items-center justify-between gap-3 rounded-ds-sm px-4 ${
                    isOnDesk ? "bg-ink-900" : "border border-steel-300 bg-surface-white"
                  }`}
                >
                  <Text
                    numberOfLines={1}
                    className={`font-body text-lg font-semibold ${
                      isOnDesk ? "text-surface-white" : "text-steel-700"
                    }`}
                  >
                    {person.name}
                  </Text>
                  {isOnDesk && <Check size={20} strokeWidth={2} color={colors.surfaceWhite} />}
                </Pressable>
                <Pressable
                  onPress={() => retireStaff(person.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${person.name} from the staff list`}
                  className="h-16 w-16 shrink-0 items-center justify-center rounded-ds-sm border border-steel-300 bg-surface-white"
                >
                  <UserMinus size={20} strokeWidth={1.75} color={colors.steel700} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {staff.length === 0 && (
        <Text className="font-body text-base text-steel-700">
          No staff added yet. Add the people who work the front desk, so the gym
          can see who recorded each payment.
        </Text>
      )}

      <View className="flex-col gap-3 border-t border-steel-300 pt-5">
        <Field
          label="Add a staff member"
          value={newName}
          onChange={setNewName}
          error={error}
          placeholder="Their name"
        />
        <Pressable
          onPress={handleAdd}
          disabled={adding || !newName.trim()}
          accessibilityRole="button"
          className="h-16 flex-row items-center justify-center gap-2 rounded-ds-sm bg-ink-900 disabled:bg-steel-300"
        >
          <Plus size={20} strokeWidth={2} color={colors.surfaceWhite} />
          <Text className="font-body text-lg font-semibold text-surface-white">
            Add to staff list
          </Text>
        </Pressable>
      </View>
    </Sheet>
  );
}
