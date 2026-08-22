// Name entry that completes from names already on the roster
// (frontend-spec.md §6.5). Ported from
// server/src/components/members/NameField.jsx, reskinned to Kinetic Court
// and styled to match Field.jsx's chrome. Web's Escape-to-dismiss keyboard
// shortcut has no RN equivalent — dismissal is a suggestion tap, or typing
// past an exact match, instead.
//
// Names repeat at a single gym — shared surnames, families on the same plan
// — and the front desk is typing on a tablet keyboard mid-conversation.
// Completing from names the gym has actually used beats retyping, and spells
// them consistently (what lets search find them later). Suggestions never
// block: two members may share a name and the member number disambiguates
// (PRODUCT.md) — an exact match is a note, not an error.

import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { CornerDownLeft } from "lucide-react-native";
import { suggestNames } from "../../domain/members.js";
import Touchable from "../ui/Touchable.jsx";
import { colors } from "../../theme/colors.js";

export default function NameField({ label, value, onChange, error }) {
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
    <View className="flex-col gap-1.5">
      <Text className="font-body-medium text-sm text-muted">{label}</Text>

      <View
        className={`h-16 flex-row items-center border bg-card px-4 ${
          error ? "border-danger" : "border-border"
        }`}
      >
        <TextInput
          value={value}
          onChangeText={(next) => {
            setDismissed(false);
            onChange(next);
          }}
          autoComplete="off"
          accessibilityLabel={label}
          accessibilityState={error ? { invalid: true } : undefined}
          className="flex-1 bg-transparent font-body-medium text-lg text-white"
        />
      </View>

      {visible && (
        <View className="overflow-hidden border border-border bg-card">
          {suggestions.map((suggestion, index) => (
            <Touchable
              key={suggestion.id}
              onPress={() => {
                onChange(suggestion.name);
                setDismissed(true);
              }}
              className={`h-14 flex-row items-center gap-3 px-4 ${
                index === suggestions.length - 1 ? "" : "border-b border-hairline"
              }`}
            >
              <CornerDownLeft size={16} strokeWidth={1.75} color={colors.textDim} />
              <Text numberOfLines={1} className="min-w-0 flex-1 font-body text-base text-white">
                {suggestion.name}
              </Text>
              <Text className="shrink-0 font-body text-sm text-dim">#{suggestion.id}</Text>
            </Touchable>
          ))}
        </View>
      )}

      {error ? (
        <Text accessibilityLiveRegion="polite" className="font-body text-sm text-danger">
          {error}
        </Text>
      ) : exactMatch ? (
        // Not a blocker — a heads-up that saves a duplicate the staff didn't
        // intend, while still allowing the one they did.
        <Text className="font-body text-sm text-muted">
          #{exactMatch.id} already uses this name. Registering makes a second member.
        </Text>
      ) : null}
    </View>
  );
}
