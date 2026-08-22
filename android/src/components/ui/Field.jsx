// Labeled input. Ported from server/src/components/ui/Field.jsx, reskinned
// to Kinetic Court. Web's htmlFor/aria-describedby id wiring has no RN
// equivalent — accessibilityLabel/accessibilityState cover the same ground
// in RN's accessibility model instead. `inputMode` is kept as the prop name
// (not renamed to RN's `keyboardType`) so every call site ported from the
// web version — `inputMode="numeric"` for amounts, etc. — needs no changes;
// it's translated to keyboardType internally.

import { Text, TextInput, View } from "react-native";
import { colors } from "../../theme/colors.js";

const KEYBOARD_TYPES = {
  numeric: "numeric",
  decimal: "decimal-pad",
  tel: "phone-pad",
  text: "default",
};

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
      <Text className="font-body-medium text-sm text-muted">{label}</Text>

      <View
        className={`h-16 flex-row items-center gap-2 border bg-card px-4 ${
          error ? "border-danger" : "border-border"
        }`}
      >
        {prefix && <Text className="shrink-0 font-heading text-lg text-muted">{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.border}
          keyboardType={KEYBOARD_TYPES[inputMode] ?? "default"}
          autoComplete="off"
          accessibilityLabel={label}
          accessibilityState={error ? { invalid: true } : undefined}
          className={`flex-1 bg-transparent text-white ${
            numeric ? "font-heading text-2xl" : "font-body-medium text-lg"
          }`}
        />
      </View>

      {error ? (
        <Text accessibilityLiveRegion="polite" className="font-body text-sm text-danger">
          {error}
        </Text>
      ) : (
        hint && <Text className="font-body text-sm text-muted">{hint}</Text>
      )}
    </View>
  );
}
