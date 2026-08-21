// Labeled input (DESIGN.md "Inputs / Fields"). Ported from
// server/src/components/ui/Field.jsx. Web's htmlFor/aria-describedby id
// wiring has no RN equivalent — accessibilityLabel/accessibilityState cover
// the same ground in RN's accessibility model instead. `inputMode` is kept
// as the prop name (not renamed to RN's `keyboardType`) so every call site
// ported from the web version — `inputMode="numeric"` for amounts, etc. —
// needs no changes; it's translated to keyboardType internally.

import { Text, TextInput, View } from "react-native";
import { colors } from "../../theme/colors.js";

const KEYBOARD_TYPES = { numeric: "numeric", tel: "phone-pad", text: "default" };

export default function Field({
  label,
  value,
  onChange,
  error,
  hint,
  prefix,
  inputMode = "text",
  numeric = false,
  placeholder,
}) {
  return (
    <View className="flex-col gap-1.5">
      <Text className="font-body text-sm font-medium text-steel-700">{label}</Text>

      <View
        className={`h-16 flex-row items-center gap-2 rounded-ds-sm border bg-surface-white px-4 ${
          error ? "border-rubber-red" : "border-steel-300"
        }`}
      >
        {prefix && <Text className="shrink-0 font-mono text-lg text-steel-700">{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.steel300}
          keyboardType={KEYBOARD_TYPES[inputMode] ?? "default"}
          autoComplete="off"
          accessibilityLabel={label}
          accessibilityState={error ? { invalid: true } : undefined}
          className={`flex-1 bg-transparent text-ink-900 ${
            numeric ? "font-numeral text-2xl" : "font-body text-lg font-medium"
          }`}
        />
      </View>

      {error ? (
        <Text accessibilityLiveRegion="polite" className="font-body text-sm text-rubber-red">
          {error}
        </Text>
      ) : (
        hint && <Text className="font-body text-sm text-steel-700">{hint}</Text>
      )}
    </View>
  );
}
