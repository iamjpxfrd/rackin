// Who is on the desk, and the gym's staff list. Ported from
// server/src/components/staff/OnDeskSheet.jsx — logic and copy unchanged,
// reskinned to Kinetic Court.

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Check, Plus, UserMinus } from "lucide-react-native";
import Sheet from "../ui/Sheet.jsx";
import Field from "../ui/Field.jsx";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { addStaff, listStaff, retireStaff, setOnDesk } from "../../domain/staff.js";
import { showToast } from "../ui/Toast.jsx";
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
      showToast(`${person.name} added to staff list`);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleSelect(staffId) {
    const person = await setOnDesk(staffId);
    showToast(`${person.name} is now on the desk`);
    onClose();
  }

  async function handleRetire(person) {
    await retireStaff(person.id);
    showToast(`${person.name} removed from staff list`);
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
                  className={`h-16 flex-1 flex-row items-center justify-between gap-3 px-4 ${
                    isOnDesk ? "bg-accent" : "border border-border bg-card"
                  }`}
                >
                  <Text
                    numberOfLines={1}
                    className={`font-body text-lg font-semibold ${
                      isOnDesk ? "text-page" : "text-muted"
                    }`}
                  >
                    {person.name}
                  </Text>
                  {isOnDesk && <Check size={20} strokeWidth={2} color={colors.page} />}
                </Pressable>
                <Pressable
                  onPress={() => handleRetire(person)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${person.name} from the staff list`}
                  className="h-16 w-16 shrink-0 items-center justify-center border border-border bg-card"
                >
                  <UserMinus size={20} strokeWidth={1.75} color={colors.textMuted} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {staff.length === 0 && (
        <Text className="font-body text-base text-muted">
          No staff added yet. Add the people who work the front desk, so the gym
          can see who recorded each payment.
        </Text>
      )}

      <View className="flex-col gap-3 border-t border-border pt-5">
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
          className="h-16 flex-row items-center justify-center gap-2 bg-accent disabled:bg-border"
        >
          <Plus size={20} strokeWidth={2} color={colors.page} />
          <Text className="font-body text-lg font-semibold text-page">
            Add to staff list
          </Text>
        </Pressable>
      </View>
    </Sheet>
  );
}
