// Segmented choice control for Plan and Payment method (frontend-spec.md
// §6.5). Ported from server/src/components/ui/ChoiceGroup.jsx, reskinned to
// Kinetic Court: the selected option is a diagonal-cut accent fill, the same
// treatment CheckInScreen's mode tabs use — unselected stays a bordered box.
// No default selection anywhere in this app: a wrong prefill would silently
// misrecord a plan or payment method (DESIGN.md).

import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { DiagonalCut } from "./DiagonalCut.jsx";
import Touchable, { usePressFlash } from "./Touchable.jsx";
import { colors } from "../../theme/colors.js";

// The mockup's exact contrast color for a secondary line of text sitting on
// the accent fill (PhoneNewMember.dc.html's plan-duration caption) — a dark
// olive rather than pure black, so it reads as "muted" without disappearing
// against lime the way textMuted/textDim would.
const ACCENT_MUTED = "#3a4a10";

// Selected is a solid accent (DiagonalCut) fill — Touchable's flash overlay
// would be invisible against a matching accent color, so this gets a scale
// pulse only (usePressFlash directly), same treatment as Numpad's own
// CHECK IN button. Unselected is a plain bordered card, where Touchable's
// flash reads clearly.
function ChoiceGroupOption({ option, selected, onPress }) {
  const { trigger, scaleStyle } = usePressFlash();

  if (selected) {
    return (
      <Pressable
        onPress={() => {
          trigger();
          onPress();
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        className="flex-1"
      >
        <Animated.View style={scaleStyle}>
          <DiagonalCut
            color={colors.accent}
            cutPercent={88}
            style={{ height: 58, alignItems: "center", justifyContent: "center", gap: 1 }}
          >
            <Text className="font-body-bold text-sm text-page">{option.label}</Text>
            {option.detail && (
              <Text className="font-body text-[10px]" style={{ color: ACCENT_MUTED }}>
                {option.detail}
              </Text>
            )}
          </DiagonalCut>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      wrapperClassName="flex-1"
      style={{
        height: 58,
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <Text className="font-body-bold text-sm text-white">{option.label}</Text>
      {option.detail && <Text className="font-body text-[10px] text-dim">{option.detail}</Text>}
    </Touchable>
  );
}

export default function ChoiceGroup({ label, options, value, onChange }) {
  return (
    <View className="flex-col gap-1.5">
      <Text className="font-body-medium text-sm text-muted">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row gap-2">
        {options.map((option) => (
          <ChoiceGroupOption
            key={String(option.value)}
            option={option}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}
