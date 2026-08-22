// Who is on the desk, and the gym's staff list. Ported from
// server/src/components/staff/OnDeskSheet.jsx — logic and copy unchanged,
// reskinned to Kinetic Court.

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Check, Plus, UserMinus } from "lucide-react-native";
import Sheet from "../ui/Sheet.jsx";
import Field from "../ui/Field.jsx";
import ConfirmDialog from "../ui/ConfirmDialog.jsx";
import Touchable, { usePressFlash } from "../ui/Touchable.jsx";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { addStaff, listStaff, retireStaff, setOnDesk } from "../../domain/staff.js";
import { clearMembersPin, getMembersPin, setMembersPin } from "../../domain/security.js";
import PinEntrySheet from "../security/PinEntrySheet.jsx";
import { showToast } from "../ui/Toast.jsx";
import { colors } from "../../theme/colors.js";

// The on-desk pill is a solid accent fill once selected — Touchable's flash
// would be invisible against a matching color, so that state gets a scale
// pulse only (same reasoning as ChoiceGroup.jsx's selected option).
function StaffSelectPill({ person, isOnDesk, onPress }) {
  const { trigger, scaleStyle } = usePressFlash();

  if (isOnDesk) {
    return (
      <Pressable
        onPress={() => {
          trigger();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        className="flex-1"
      >
        <Animated.View
          style={[
            scaleStyle,
            {
              height: 64,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingHorizontal: 16,
              backgroundColor: colors.accent,
            },
          ]}
        >
          <Text numberOfLines={1} className="font-body-semibold text-lg text-page">
            {person.name}
          </Text>
          <Check size={20} strokeWidth={2} color={colors.page} />
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Touchable
      onPress={onPress}
      accessibilityState={{ selected: false }}
      wrapperClassName="flex-1"
      className="h-16 flex-row items-center justify-between gap-3 border border-border bg-card px-4"
    >
      <Text numberOfLines={1} className="font-body-semibold text-lg text-muted">
        {person.name}
      </Text>
    </Touchable>
  );
}

export default function OnDeskSheet({ onDesk, onClose }) {
  const staff = useLiveQuery(() => listStaff(), [], []);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  // The person a REMOVE tap is pending confirmation for — null means no
  // dialog showing. Retiring someone can't be undone from this screen, so
  // it's the one destructive action here that gets a confirm step.
  const [pendingRemove, setPendingRemove] = useState(null);
  // Solid accent fill, same "flash would be invisible against a matching
  // color" reasoning as StaffSelectPill's on-desk state — scale pulse only.
  const addButtonPress = usePressFlash();

  const membersPin = useLiveQuery(() => getMembersPin());
  const [pinSheetOpen, setPinSheetOpen] = useState(false);
  const [pendingRemovePin, setPendingRemovePin] = useState(false);

  async function handleSavePin(pin) {
    await setMembersPin(pin);
    setPinSheetOpen(false);
    showToast("Members tab PIN set");
  }

  async function confirmRemovePin() {
    setPendingRemovePin(false);
    await clearMembersPin();
    showToast("Members tab PIN removed");
  }

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

  async function confirmRetire() {
    const person = pendingRemove;
    setPendingRemove(null);
    await retireStaff(person.id);
    showToast(`${person.name} removed from staff list`);
  }

  return (
    <>
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
                <StaffSelectPill person={person} isOnDesk={isOnDesk} onPress={() => handleSelect(person.id)} />
                <Touchable
                  onPress={() => setPendingRemove(person)}
                  accessibilityLabel={`Remove ${person.name} from the staff list`}
                  wrapperClassName="shrink-0"
                  className="h-16 w-16 items-center justify-center border border-border bg-card"
                >
                  <UserMinus size={20} strokeWidth={1.75} color={colors.textMuted} />
                </Touchable>
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
          onPress={() => {
            addButtonPress.trigger();
            handleAdd();
          }}
          disabled={adding || !newName.trim()}
          accessibilityRole="button"
        >
          <Animated.View
            style={[
              addButtonPress.scaleStyle,
              { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 64 },
            ]}
            className={adding || !newName.trim() ? "bg-border" : "bg-accent"}
          >
            <Plus size={20} strokeWidth={2} color={colors.page} />
            <Text className="font-body-semibold text-lg text-page">
              Add to staff list
            </Text>
          </Animated.View>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between gap-3 border-t border-border pt-5">
        <View className="min-w-0 flex-1">
          <Text className="font-body-medium text-sm text-white">Members tab PIN</Text>
          <Text className="font-body text-xs text-muted">
            {membersPin ? "Set — required to open Members" : "Not set — Members is open to anyone"}
          </Text>
        </View>
        <View className="shrink-0 flex-row gap-2">
          <Touchable
            onPress={() => setPinSheetOpen(true)}
            className="h-11 items-center justify-center border border-border bg-card px-4"
          >
            <Text className="font-heading text-xs tracking-wide text-white">
              {membersPin ? "CHANGE" : "SET"}
            </Text>
          </Touchable>
          {membersPin && (
            <Touchable
              onPress={() => setPendingRemovePin(true)}
              accessibilityLabel="Remove the Members tab PIN"
              className="h-11 w-11 items-center justify-center border border-border bg-card"
            >
              <UserMinus size={18} strokeWidth={1.75} color={colors.textMuted} />
            </Touchable>
          )}
        </View>
      </View>
    </Sheet>

    {/* Sibling of Sheet, not nested inside it — Sheet's own children sit
        inside its bounded bottom-card, but this needs Sheet's same
        absolute-inset-0 full-screen positioning context (both are mounted
        directly under SafeAreaView via TopBar) to center over the whole
        screen, not just the card. */}
    <ConfirmDialog
      visible={pendingRemove !== null}
      title="Remove staff member?"
      message={pendingRemove ? `${pendingRemove.name} will be removed from the staff list.` : ""}
      onConfirm={confirmRetire}
      onCancel={() => setPendingRemove(null)}
    />

    <ConfirmDialog
      visible={pendingRemovePin}
      title="Remove the Members PIN?"
      message="Members will be open to anyone until a new PIN is set."
      onConfirm={confirmRemovePin}
      onCancel={() => setPendingRemovePin(false)}
    />

    {pinSheetOpen && (
      <PinEntrySheet mode="set" onSave={handleSavePin} onClose={() => setPinSheetOpen(false)} />
    )}
    </>
  );
}
