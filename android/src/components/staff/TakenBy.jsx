// Who is taking this money (frontend-spec.md §6.4) — the one place
// attribution is confirmed rather than assumed. A check-in takes the shift
// default silently, because a misattributed visit is trivia; a payment asks,
// because an unattributed cash payment is the question nobody can answer
// afterward when the day's takings don't reconcile. Ported from
// server/src/components/staff/TakenBy.jsx, reskinned to Kinetic Court and
// styled after OnDeskSheet.jsx's staff-chip list.
//
// Correcting it also moves the shift: choosing someone else here calls
// setOnDesk exactly like OnDeskSheet does, so the correction is recorded
// once rather than repeated on every payment for the rest of the shift.

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { UserRound } from "lucide-react-native";
import { useLiveQuery } from "../../hooks/useLiveQuery.js";
import { listStaff, setOnDesk } from "../../domain/staff.js";
import Touchable, { usePressFlash } from "../ui/Touchable.jsx";
import { colors } from "../../theme/colors.js";

// Selected is a solid accent fill — Touchable's flash would be invisible
// against a matching color, so it gets a scale pulse only (same reasoning
// as ChoiceGroup.jsx's selected option).
function TakenByOption({ person, selected, onPress }) {
  const { trigger, scaleStyle } = usePressFlash();

  if (selected) {
    return (
      <Pressable
        onPress={() => {
          trigger();
          onPress();
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected: true }}
        className="min-w-[112px] flex-1"
      >
        <Animated.View
          style={[
            scaleStyle,
            { height: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent },
          ]}
        >
          <Text numberOfLines={1} className="font-body-semibold text-base text-page">
            {person.name}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: false }}
      wrapperClassName="min-w-[112px] flex-1"
      className="h-12 items-center justify-center border border-border bg-page px-3"
    >
      <Text numberOfLines={1} className="font-body-semibold text-base text-muted">
        {person.name}
      </Text>
    </Touchable>
  );
}

export default function TakenBy({ value, onChange }) {
  const staff = useLiveQuery(() => listStaff(), [], []);
  const [choosing, setChoosing] = useState(false);

  const others = staff.filter((person) => person.id !== value?.id);

  async function choose(person) {
    onChange(person);
    await setOnDesk(person.id);
    setChoosing(false);
  }

  if (staff.length === 0) {
    return (
      <View className="border border-border bg-card p-4">
        <Text className="font-body text-sm text-muted">
          No staff list yet — this payment will be recorded without a name.
          Add staff from the top bar to record who takes payments.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-col gap-3 border border-border bg-card p-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <UserRound size={18} strokeWidth={1.75} color={colors.textMuted} />
          <Text numberOfLines={1} className="min-w-0 flex-1 font-body text-sm text-muted">
            Taken by{" "}
            <Text className="font-body-semibold text-white">
              {value ? value.name : "nobody yet"}
            </Text>
          </Text>
        </View>

        {!choosing && others.length > 0 && (
          <Touchable
            onPress={() => setChoosing(true)}
            wrapperClassName="shrink-0"
            className="h-10 items-center justify-center border border-border bg-page px-3"
          >
            <Text className="font-body-semibold text-sm text-muted">
              {value ? "Not me" : "Choose"}
            </Text>
          </Touchable>
        )}
      </View>

      {choosing && (
        <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
          {staff.map((person) => (
            <TakenByOption
              key={person.id}
              person={person}
              selected={person.id === value?.id}
              onPress={() => choose(person)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
